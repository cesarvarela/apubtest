import { NormalizationResult, NormalizedEntity } from '@/lib/normalization';

export interface FieldInfo {
  key: string;
  label: string;
  type: 'string' | 'date' | 'number' | 'array' | 'object';
  frequency: number; // How many entities have this field (0-1)
  totalCount: number; // Total entities with this field
  entityCount: number; // Total entities of this type
  isCommon: boolean; // True if field appears in >50% of entities
}

export interface RelationshipInfo {
  key: string;
  label: string;
  targetEntityTypes: string[];
  frequency: number;
  totalCount: number;
}

/**
 * Dynamically extract available fields for a specific entity type
 */
export function extractAvailableFields(
  normalizedData: NormalizationResult, 
  entityType: string
): FieldInfo[] {
  const entities = normalizedData.extracted[entityType] || [];
  
  if (entities.length === 0) {
    return [];
  }

  // Collect all unique field names across all entities of this type
  const fieldCounts = new Map<string, number>();
  const fieldSamples = new Map<string, any[]>();
  const fieldVariations = new Map<string, Set<string>>(); // Track different keys for same logical field

  entities.forEach(entity => {
    Object.keys(entity.properties).forEach(fieldName => {
      // Extract canonical field name (remove URI prefixes)
      const canonicalName = extractCanonicalFieldName(fieldName);
      
      // Track variations of the same logical field
      if (!fieldVariations.has(canonicalName)) {
        fieldVariations.set(canonicalName, new Set());
      }
      fieldVariations.get(canonicalName)!.add(fieldName);
      
      fieldCounts.set(canonicalName, (fieldCounts.get(canonicalName) || 0) + 1);
      
      if (!fieldSamples.has(canonicalName)) {
        fieldSamples.set(canonicalName, []);
      }
      
      const samples = fieldSamples.get(canonicalName)!;
      if (samples.length < 5) { // Keep up to 5 samples for type inference
        samples.push(entity.properties[fieldName]);
      }
    });
  });

  // Convert to FieldInfo objects with type inference
  const fields: FieldInfo[] = [];
  
  fieldCounts.forEach((count, canonicalName) => {
    const samples = fieldSamples.get(canonicalName) || [];
    const type = inferFieldType(canonicalName, samples);
    const frequency = count / entities.length;
    
    fields.push({
      key: canonicalName,
      label: formatFieldLabel(canonicalName),
      type,
      frequency,
      totalCount: count,
      entityCount: entities.length,
      isCommon: frequency > 0.5
    });
  });

  // Sort by frequency (most common first), then by name
  fields.sort((a, b) => {
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }
    return a.label.localeCompare(b.label);
  });

  return fields;
}

/**
 * Extract canonical field name from various URI formats
 */
function extractCanonicalFieldName(fieldName: string): string {
  // Handle expanded URI format (e.g., "https://example.org/aiid#date" -> "date")
  if (fieldName.includes('://')) {
    if (fieldName.includes('#')) {
      return fieldName.split('#').pop() || fieldName;
    } else {
      return fieldName.split('/').pop() || fieldName;
    }
  }
  
  // Handle prefixed format (e.g., "aiid:date" -> "date")
  if (fieldName.includes(':') && !fieldName.includes('://')) {
    return fieldName.split(':').pop() || fieldName;
  }
  
  return fieldName;
}

/**
 * Extract available relationships for a specific entity type  
 */
export function extractAvailableRelationships(
  normalizedData: NormalizationResult,
  entityType: string
): RelationshipInfo[] {
  const entities = normalizedData.extracted[entityType] || [];
  
  if (entities.length === 0) {
    return [];
  }

  // Collect relationship statistics
  const relationshipCounts = new Map<string, number>();
  const relationshipTargets = new Map<string, Set<string>>();

  entities.forEach(entity => {
    Object.entries(entity).forEach(([relationName, value]) => {
      if (relationName.startsWith('@')) return;
      
      // Check if it's a relationship
      const refs = Array.isArray(value) 
        ? value.filter(v => v && typeof v === 'object' && v['@id'])
        : (value && typeof value === 'object' && value['@id'] ? [value] : []);
      
      if (refs.length === 0) return;
      
      const targetIds = refs.map(r => r['@id']);
      relationshipCounts.set(relationName, (relationshipCounts.get(relationName) || 0) + 1);
      
      if (!relationshipTargets.has(relationName)) {
        relationshipTargets.set(relationName, new Set());
      }
      
      const targetTypes = relationshipTargets.get(relationName)!;
      refs.forEach(ref => {
        if (ref['@type']) {
          targetTypes.add(ref['@type']);
        }
      });
    });
  });

  // Convert to RelationshipInfo objects
  const relationships: RelationshipInfo[] = [];
  
  relationshipCounts.forEach((count, relationName) => {
    const targetTypes = Array.from(relationshipTargets.get(relationName) || []);
    const frequency = count / entities.length;
    
    relationships.push({
      key: relationName,
      label: formatRelationshipLabel(relationName),
      targetEntityTypes: targetTypes,
      frequency,
      totalCount: count
    });
  });

  // Sort by frequency (most common first), then by name
  relationships.sort((a, b) => {
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }
    return a.label.localeCompare(b.label);
  });

  return relationships;
}

/**
 * Get compatible dimension entities for a given measure entity and relationship
 */
export function getCompatibleDimensionEntities(
  normalizedData: NormalizationResult,
  measureEntityType: string,
  relationshipKey?: string
): string[] {
  if (!relationshipKey || relationshipKey === 'none') {
    // Same entity - return the measure entity type
    return [measureEntityType];
  }

  // Find what entity types this relationship points to
  const relationshipInfo = extractAvailableRelationships(normalizedData, measureEntityType)
    .find(rel => rel.key === relationshipKey);
  
  return relationshipInfo?.targetEntityTypes || [];
}

/**
 * Infer field type from field name and sample values
 */
function inferFieldType(fieldName: string, samples: any[]): 'string' | 'date' | 'number' | 'array' | 'object' {
  if (samples.length === 0) return 'string';

  // Check for date patterns in field name
  if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) {
    return 'date';
  }

  // Check for ID patterns
  if (fieldName.toLowerCase().includes('id') || fieldName.toLowerCase().includes('count')) {
    return 'string'; // IDs are treated as strings for grouping
  }

  // Analyze sample values
  const firstSample = samples[0];
  
  if (Array.isArray(firstSample)) {
    return 'array';
  }
  
  if (typeof firstSample === 'object' && firstSample !== null) {
    return 'object';
  }
  
  if (typeof firstSample === 'number') {
    return 'number';
  }

  // Check if it looks like a date string
  if (typeof firstSample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstSample)) {
    return 'date';
  }

  return 'string';
}

/**
 * Format field name into user-friendly label
 */
export function formatFieldLabel(fieldName: string): string {
  // Handle camelCase and snake_case
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Split camelCase
    .replace(/_/g, ' ') // Replace underscores
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Format relationship name into user-friendly label
 */
function formatRelationshipLabel(relationName: string): string {
  // Remove reverse prefix if present
  let cleanName = relationName.startsWith('_reverse_') 
    ? relationName.substring(9) 
    : relationName;
  
  // Handle expanded URI format (e.g., "https://example.org/aiid#deployedBy" -> "deployedBy")
  if (cleanName.includes('://')) {
    // Extract the local name after the hash fragment
    if (cleanName.includes('#')) {
      cleanName = cleanName.split('#').pop() || cleanName;
    } else {
      // If no hash, take the last part after the last slash
      cleanName = cleanName.split('/').pop() || cleanName;
    }
  }
  
  // Handle prefixed format (e.g., "aiid:deployedBy" -> "deployedBy")
  if (cleanName.includes(':') && !cleanName.includes('://')) {
    cleanName = cleanName.split(':').pop() || cleanName;
  }
    
  return formatFieldLabel(cleanName);
}