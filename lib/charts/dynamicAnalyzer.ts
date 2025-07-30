/**
 * Dynamic data analysis utilities for schema-agnostic chart building
 * Works with any normalized data structure, not tied to specific entity types
 */

import { NormalizationResult, NormalizedEntity, EntityReference } from '../normalization';

// Types for dynamic analysis
export interface EntityTypeInfo {
  type: string;
  label: string;
  count: number;
  sampleEntity?: NormalizedEntity;
}

export interface FieldInfo {
  fieldName: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'reference';
  frequency: number; // 0-1, how often this field appears in entities of this type
  totalCount: number; // total number of entities that have this field
  entityCount: number; // total number of entities of this type
  sampleValues: any[];
  isCommon: boolean; // true if frequency > 0.8
}

export interface RelationshipInfo {
  relationName: string;
  sourceType: string;
  targetTypes: string[];
  frequency: number; // 0-1, how often entities of sourceType have this relationship
  totalCount: number; // total number of relationships of this type
  isReverse: boolean; // true if this is a reverse relationship (starts with 'reverse_')
  label: string; // human-readable label
}

export interface RelationshipPath {
  path: string[]; // ['sourceType', 'relationName', 'targetType']
  label: string; // human-readable description
  viable: boolean; // true if this path can produce meaningful results
}

/**
 * Discovers all entity types in the normalized data
 */
export function discoverEntityTypes(normalizedData: NormalizationResult): EntityTypeInfo[] {
  return Object.entries(normalizedData.extracted).map(([type, entities]) => ({
    type,
    label: formatEntityTypeLabel(type),
    count: entities.length,
    sampleEntity: entities[0] || undefined
  })).sort((a, b) => b.count - a.count); // Sort by count, most common first
}

/**
 * Formats entity type names for display
 * Examples: "aiid:Report" → "Reports", "core:Person" → "Persons"
 */
export function formatEntityTypeLabel(type: string): string {
  // Extract the main part after namespace prefix
  const mainPart = type.includes(':') ? type.split(':')[1] : type;
  
  // Convert to title case and pluralize
  const formatted = mainPart
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .trim()
    .toLowerCase()
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  
  // Simple pluralization (can be enhanced)
  if (!formatted.endsWith('s') && !formatted.endsWith('es')) {
    return formatted + 's';
  }
  
  return formatted;
}

/**
 * Analyzes all fields available in entities of a specific type
 */
export function analyzeEntityFields(entities: NormalizedEntity[]): FieldInfo[] {
  if (!entities || entities.length === 0) return [];
  
  const fieldStats: { [fieldName: string]: FieldInfo } = {};
  
  entities.forEach(entity => {
    Object.entries(entity).forEach(([fieldName, value]) => {
      // Skip @type but allow @id and reverse relationships for field analysis
      if (fieldName === '@type') return;
      
      if (!fieldStats[fieldName]) {
        fieldStats[fieldName] = {
          fieldName,
          type: inferFieldType(fieldName, value),
          frequency: 0,
          totalCount: 0,
          entityCount: entities.length,
          sampleValues: [],
          isCommon: false
        };
      }
      
      fieldStats[fieldName].totalCount++;
      
      // Collect sample values (up to 5)
      if (fieldStats[fieldName].sampleValues.length < 5) {
        const sampleValue = Array.isArray(value) ? `[${value.length} items]` : 
                          typeof value === 'object' ? '[object]' : 
                          String(value);
        if (!fieldStats[fieldName].sampleValues.includes(sampleValue)) {
          fieldStats[fieldName].sampleValues.push(sampleValue);
        }
      }
    });
  });
  
  // Calculate frequencies and mark common fields
  Object.values(fieldStats).forEach(field => {
    field.frequency = field.totalCount / field.entityCount;
    field.isCommon = field.frequency > 0.8;
  });
  
  return Object.values(fieldStats).sort((a, b) => b.frequency - a.frequency);
}

/**
 * Infers the type of a field based on its name and value
 */
function inferFieldType(fieldName: string, value: any): FieldInfo['type'] {
  if (Array.isArray(value)) {
    // Check if it's an array of references
    if (value.length > 0 && value[0] && typeof value[0] === 'object' && value[0]['@type'] && value[0]['@id']) {
      return 'reference';
    }
    return 'array';
  }
  
  if (value && typeof value === 'object') {
    // Check if it's a reference
    if (value['@type'] && value['@id']) {
      return 'reference';
    }
    return 'object';
  }
  
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  
  // Heuristics for dates
  if (typeof value === 'string') {
    if (fieldName.toLowerCase().includes('date') || 
        fieldName.toLowerCase().includes('time') ||
        /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'date';
    }
  }
  
  return 'string';
}

/**
 * Discovers all relationships from entities of a specific type
 */
export function discoverRelationships(normalizedData: NormalizationResult, sourceType: string): RelationshipInfo[] {
  const entities = normalizedData.extracted[sourceType];
  if (!entities || entities.length === 0) return [];
  
  const relationshipStats: { [relationName: string]: RelationshipInfo } = {};
  
  entities.forEach(entity => {
    Object.entries(entity).forEach(([key, value]) => {
      // Skip non-relationship fields
      if (key.startsWith('@')) return;
      
      // Check if this is a relationship (array of references or single reference)
      const isRelationship = (Array.isArray(value) && value.length > 0 && 
                             value[0] && typeof value[0] === 'object' && 
                             value[0]['@type'] && value[0]['@id']) ||
                            (value && typeof value === 'object' && 
                             value['@type'] && value['@id']);
      
      if (!isRelationship) return;
      
      if (!relationshipStats[key]) {
        relationshipStats[key] = {
          relationName: key,
          sourceType,
          targetTypes: [],
          frequency: 0,
          totalCount: 0,
          isReverse: key.startsWith('reverse_'),
          label: formatRelationshipLabel(key)
        };
      }
      
      relationshipStats[key].totalCount++;
      
      // Collect target types
      const targets = Array.isArray(value) ? value : [value];
      targets.forEach((target: EntityReference) => {
        if (target['@type'] && !relationshipStats[key].targetTypes.includes(target['@type'])) {
          relationshipStats[key].targetTypes.push(target['@type']);
        }
      });
    });
  });
  
  // Calculate frequencies
  Object.values(relationshipStats).forEach(rel => {
    rel.frequency = rel.totalCount / entities.length;
  });
  
  return Object.values(relationshipStats).sort((a, b) => b.frequency - a.frequency);
}

/**
 * Formats relationship names for display
 */
export function formatRelationshipLabel(relationName: string): string {
  let label = relationName;
  
  // Handle reverse relationships
  if (label.startsWith('reverse_')) {
    label = label.substring(8); // Remove 'reverse_'
    label = `← ${label}`; // Add arrow to indicate reverse
  }
  
  // Convert camelCase to readable format
  return label
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Discovers all possible relationship paths for chart building
 */
export function discoverRelationshipPaths(
  normalizedData: NormalizationResult, 
  sourceType: string, 
  maxDepth: number = 2
): RelationshipPath[] {
  const paths: RelationshipPath[] = [];
  const visited = new Set<string>();
  
  function exploreRelationships(currentType: string, path: string[], depth: number) {
    if (depth >= maxDepth) return;
    
    const relationships = discoverRelationships(normalizedData, currentType);
    
    relationships.forEach(rel => {
      rel.targetTypes.forEach(targetType => {
        const newPath = [...path, rel.relationName, targetType];
        const pathKey = newPath.join('→');
        
        if (!visited.has(pathKey)) {
          visited.add(pathKey);
          
          paths.push({
            path: newPath,
            label: formatRelationshipPath(newPath),
            viable: rel.frequency > 0.1 // Only include if reasonably common
          });
          
          // Recurse for deeper paths
          if (depth < maxDepth - 1) {
            exploreRelationships(targetType, newPath, depth + 1);
          }
        }
      });
    });
  }
  
  exploreRelationships(sourceType, [sourceType], 0);
  
  return paths.filter(p => p.viable).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Formats a relationship path for display
 */
function formatRelationshipPath(path: string[]): string {
  const parts = [];
  for (let i = 0; i < path.length; i += 2) {
    if (i === 0) {
      parts.push(formatEntityTypeLabel(path[i]));
    } else {
      const relationName = path[i - 1];
      const entityType = path[i];
      parts.push(`${formatRelationshipLabel(relationName)} ${formatEntityTypeLabel(entityType)}`);
    }
  }
  return parts.join(' → ');
}

/**
 * Gets compatible target entity types for a given relationship from source type
 */
export function getCompatibleTargetTypes(
  normalizedData: NormalizationResult,
  sourceType: string,
  relationName?: string
): string[] {
  if (!relationName) {
    // If no relationship specified, return the same type (for direct field grouping)
    return [sourceType];
  }
  
  const relationships = discoverRelationships(normalizedData, sourceType);
  const relationship = relationships.find(r => r.relationName === relationName);
  
  return relationship ? relationship.targetTypes : [];
}

/**
 * Gets all fields suitable for grouping from a specific entity type
 */
export function getGroupingOptions(normalizedData: NormalizationResult, entityType: string): FieldInfo[] {
  const entities = normalizedData.extracted[entityType];
  if (!entities || entities.length === 0) return [];
  
  return analyzeEntityFields(entities).filter(field => {
    // Filter out fields that are not suitable for grouping
    return field.fieldName !== '@type';
  });
}

/**
 * Gets target types for a grouping field (for reference fields)
 */
export function getGroupingTargetTypes(
  normalizedData: NormalizationResult, 
  entityType: string, 
  fieldName: string
): string[] {
  const entities = normalizedData.extracted[entityType];
  if (!entities || entities.length === 0) return [];
  
  const targetTypes = new Set<string>();
  
  entities.forEach(entity => {
    const fieldValue = entity[fieldName];
    if (fieldValue) {
      if (Array.isArray(fieldValue)) {
        fieldValue.forEach(item => {
          if (item && typeof item === 'object' && item['@type']) {
            targetTypes.add(item['@type']);
          }
        });
      } else if (typeof fieldValue === 'object' && fieldValue['@type']) {
        targetTypes.add(fieldValue['@type']);
      }
    }
  });
  
  return Array.from(targetTypes);
}

/**
 * Gets fields that can be used as display labels for reference fields
 */
export function getDisplayableFields(
  normalizedData: NormalizationResult, 
  targetTypes: string[]
): FieldInfo[] {
  const displayFields = new Map<string, FieldInfo>();
  
  targetTypes.forEach(targetType => {
    const entities = normalizedData.extracted[targetType];
    if (entities && entities.length > 0) {
      const fields = analyzeEntityFields(entities);
      
      // Prefer common string fields that are likely to be good labels
      fields
        .filter(field => 
          field.type === 'string' && 
          field.frequency > 0.5 && 
          field.fieldName !== '@type'
        )
        .forEach(field => {
          // Use the field with highest frequency if there are duplicates across types
          if (!displayFields.has(field.fieldName) || 
              field.frequency > displayFields.get(field.fieldName)!.frequency) {
            displayFields.set(field.fieldName, field);
          }
        });
    }
  });
  
  return Array.from(displayFields.values()).sort((a, b) => b.frequency - a.frequency);
}

/**
 * Selects the best default display field from available options
 */
export function selectDefaultDisplayField(availableFields: string[]): string | null {
  if (!availableFields || availableFields.length === 0) return null;
  
  // Priority order for common label fields
  const preferredFields = ['name', 'title', 'label', 'description'];
  
  for (const preferred of preferredFields) {
    if (availableFields.includes(preferred)) {
      return preferred;
    }
  }
  
  // If no preferred field found, return the first available
  return availableFields[0];
}