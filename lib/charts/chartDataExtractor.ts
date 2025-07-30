/**
 * Universal chart data extraction engine for normalized data
 * Works with any entity types and relationships discovered dynamically
 */

import { NormalizationResult, NormalizedEntity, EntityReference } from '../normalization';
import { 
  discoverEntityTypes, 
  discoverRelationships, 
  analyzeEntityFields,
  getCompatibleTargetTypes,
  RelationshipInfo,
  FieldInfo 
} from './dynamicAnalyzer';

// Chart configuration types
export interface ChartConfig {
  sourceType: string;
  groupBy: string;
  groupByFieldType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'reference'; // Type of the groupBy field for smart sorting
  groupByLabelField?: string; // When grouping by references, which field to use for display labels
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'cumulative';
  valueField?: string; // Required for sum, avg, min, max
  relationshipPath?: string[]; // For relationship traversal ['reports', 'authors']
  filters?: ChartFilter[];
  targetTypeFilter?: string; // Filter mixed-type reference fields to specific type
  sortBy?: 'count-desc' | 'count-asc' | 'alpha-asc' | 'alpha-desc' | 'chrono-asc' | 'chrono-desc'; // How to sort the final chart data
}

export interface ChartFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  count: number; // Number of entities that contributed to this data point
  entities: EntityReference[]; // References to contributing entities
}

export interface ChartResult {
  data: ChartDataPoint[];
  config: ChartConfig;
  metadata: {
    totalEntities: number;
    uniqueGroups: number;
    sourceEntityType: string;
    targetEntityType?: string;
  };
}

/**
 * Extracts chart data based on configuration
 */
export function extractChartData(
  normalizedData: NormalizationResult,
  config: ChartConfig
): ChartResult {
  // Get source entities
  const sourceEntities = normalizedData.extracted[config.sourceType] || [];
  
  if (sourceEntities.length === 0) {
    return {
      data: [],
      config,
      metadata: {
        totalEntities: 0,
        uniqueGroups: 0,
        sourceEntityType: config.sourceType
      }
    };
  }

  // Apply filters first
  const filteredEntities = applyFilters(sourceEntities, config.filters || []);
  
  // Follow relationship path if specified
  const targetEntities = config.relationshipPath && config.relationshipPath.length > 0
    ? followRelationshipPath(normalizedData, filteredEntities, config.relationshipPath)
    : filteredEntities;

  // Group entities by the specified field
  const groupedData = groupEntitiesByField(targetEntities, config.groupBy, normalizedData, config);
  
  // Apply aggregation
  const chartData = applyAggregation(groupedData, config);
  
  // Determine target entity type
  const targetEntityType = targetEntities.length > 0 ? targetEntities[0]['@type'] : config.sourceType;
  
  // Apply sorting based on user configuration
  let sortedChartData = [...chartData];
  const sortBy = config.sortBy || 'count-desc'; // Default to count descending
  
  switch (sortBy) {
    case 'count-desc':
      sortedChartData.sort((a, b) => b.value - a.value);
      break;
    case 'count-asc':
      sortedChartData.sort((a, b) => a.value - b.value);
      break;
    case 'alpha-asc':
      sortedChartData.sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'alpha-desc':
      sortedChartData.sort((a, b) => b.label.localeCompare(a.label));
      break;
    case 'chrono-asc':
      sortedChartData.sort((a, b) => {
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return dateA.getTime() - dateB.getTime();
      });
      break;
    case 'chrono-desc':
      sortedChartData.sort((a, b) => {
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return dateB.getTime() - dateA.getTime();
      });
      break;
    default:
      // Fallback to count descending
      sortedChartData.sort((a, b) => b.value - a.value);
  }

  return {
    data: sortedChartData,
    config,
    metadata: {
      totalEntities: filteredEntities.length,
      uniqueGroups: chartData.length,
      sourceEntityType: config.sourceType,
      targetEntityType: targetEntityType !== config.sourceType ? targetEntityType : undefined
    }
  };
}

/**
 * Applies filters to entities
 */
function applyFilters(entities: NormalizedEntity[], filters: ChartFilter[]): NormalizedEntity[] {
  return entities.filter(entity => {
    return filters.every(filter => {
      const fieldValue = entity[filter.field];
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(filter.value);
        case 'less_than':
          return Number(fieldValue) < Number(filter.value);
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(fieldValue);
        default:
          return true;
      }
    });
  });
}

/**
 * Follows a relationship path to get target entities
 */
function followRelationshipPath(
  normalizedData: NormalizationResult,
  sourceEntities: NormalizedEntity[],
  relationshipPath: string[]
): NormalizedEntity[] {
  let currentEntities = sourceEntities;
  
  for (const relationName of relationshipPath) {
    const nextEntities: NormalizedEntity[] = [];
    
    for (const entity of currentEntities) {
      const relationValue = entity[relationName];
      
      if (Array.isArray(relationValue)) {
        // Handle array of references
        for (const ref of relationValue) {
          if (ref && ref['@type'] && ref['@id']) {
            const targetEntity = findEntityByReference(normalizedData, ref);
            if (targetEntity) {
              nextEntities.push(targetEntity);
            }
          }
        }
      } else if (relationValue && relationValue['@type'] && relationValue['@id']) {
        // Handle single reference
        const targetEntity = findEntityByReference(normalizedData, relationValue);
        if (targetEntity) {
          nextEntities.push(targetEntity);
        }
      }
    }
    
    currentEntities = nextEntities;
  }
  
  return currentEntities;
}

/**
 * Finds an entity by its reference
 */
function findEntityByReference(
  normalizedData: NormalizationResult,
  reference: EntityReference
): NormalizedEntity | null {
  const entities = normalizedData.extracted[reference['@type']];
  if (!entities) return null;
  
  return entities.find(entity => entity['@id'] === reference['@id']) || null;
}

/**
 * Groups entities by a field value, with support for reference resolution
 */
function groupEntitiesByField(
  entities: NormalizedEntity[],
  groupByField: string,
  normalizedData?: NormalizationResult,
  config?: ChartConfig
): { [key: string]: NormalizedEntity[] } {
  const groups: { [key: string]: NormalizedEntity[] } = {};
  
  entities.forEach(entity => {
    const fieldValue = entity[groupByField];
    
    if (fieldValue === null || fieldValue === undefined) {
      const groupKey = '(Not specified)';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(entity);
    } else if (Array.isArray(fieldValue)) {
      // For array fields, create separate entries for each item
      fieldValue.forEach(item => {
        // Apply target type filter if specified
        if (config?.targetTypeFilter && typeof item === 'object' && item['@type']) {
          if (item['@type'] !== config.targetTypeFilter) {
            return; // Skip this item if it doesn't match the target type filter
          }
        }
        
        let key: string;
        if (typeof item === 'object' && item['@id'] && item['@type']) {
          // Try to resolve the reference to get a readable name
          if (normalizedData) {
            const resolvedEntity = findEntityByReference(normalizedData, item);
            if (resolvedEntity) {
              // Use the specified label field or find best available display field
              if (config?.groupByLabelField && resolvedEntity[config.groupByLabelField]) {
                key = resolvedEntity[config.groupByLabelField];
              } else {
                // Use dynamic fallback - no hardcoded field names
                const bestDisplayField = findBestDisplayField(resolvedEntity);
                key = bestDisplayField || item['@id'];
              }
            } else {
              key = item['@id'];
            }
          } else {
            key = item['@id'];
          }
        } else {
          key = String(item);
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(entity);
      });
    } else if (typeof fieldValue === 'object' && fieldValue['@type'] && fieldValue['@id']) {
      // For reference objects, try to resolve to get readable name
      let groupKey: string;
      if (normalizedData) {
        const resolvedEntity = findEntityByReference(normalizedData, fieldValue);
        if (resolvedEntity) {
          // Use the specified label field or find best available display field
          if (config?.groupByLabelField && resolvedEntity[config.groupByLabelField]) {
            groupKey = resolvedEntity[config.groupByLabelField];
          } else {
            // Use dynamic fallback - no hardcoded field names
            const bestDisplayField = findBestDisplayField(resolvedEntity);
            groupKey = bestDisplayField || fieldValue['@id'];
          }
        } else {
          groupKey = fieldValue['@id'];
        }
      } else {
        groupKey = fieldValue['@id'];
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(entity);
    } else {
      const groupKey = String(fieldValue);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(entity);
    }
  });
  
  return groups;
}

/**
 * Applies aggregation to grouped data
 */
function applyAggregation(
  groupedData: { [key: string]: NormalizedEntity[] },
  config: ChartConfig
): ChartDataPoint[] {
  const dataPoints = Object.entries(groupedData).map(([label, entities]) => {
    let value: number;
    
    switch (config.aggregation) {
      case 'count':
        value = entities.length;
        break;
      case 'sum':
        value = entities.reduce((sum, entity) => {
          const fieldValue = config.valueField ? entity[config.valueField] : 0;
          return sum + (Number(fieldValue) || 0);
        }, 0);
        break;
      case 'avg':
        const sum = entities.reduce((sum, entity) => {
          const fieldValue = config.valueField ? entity[config.valueField] : 0;
          return sum + (Number(fieldValue) || 0);
        }, 0);
        value = entities.length > 0 ? sum / entities.length : 0;
        break;
      case 'min':
        value = entities.reduce((min, entity) => {
          const fieldValue = config.valueField ? entity[config.valueField] : 0;
          const numValue = Number(fieldValue) || 0;
          return numValue < min ? numValue : min;
        }, Infinity);
        if (value === Infinity) value = 0;
        break;
      case 'max':
        value = entities.reduce((max, entity) => {
          const fieldValue = config.valueField ? entity[config.valueField] : 0;
          const numValue = Number(fieldValue) || 0;
          return numValue > max ? numValue : max;
        }, -Infinity);
        if (value === -Infinity) value = 0;
        break;
      case 'cumulative':
        // For cumulative, we'll calculate running totals after sorting
        value = entities.length; // Start with count, will be updated in cumulative calculation
        break;
      default:
        value = entities.length;
    }
    
    return {
      label: formatLabel(label),
      value,
      count: entities.length,
      entities: entities.map(entity => ({
        '@type': entity['@type'],
        '@id': entity['@id']
      }))
    };
  });

  // Handle cumulative aggregation
  if (config.aggregation === 'cumulative') {
    return applyCumulativeCalculation(dataPoints);
  }

  return dataPoints;
}

/**
 * Applies cumulative calculation to data points  
 * Calculates running totals based on chronological order but preserves original array order
 */
function applyCumulativeCalculation(dataPoints: ChartDataPoint[]): ChartDataPoint[] {
  // Create chronologically sorted version for calculation only
  const chronoSorted = [...dataPoints].sort((a, b) => {
    const dateA = new Date(a.label);
    const dateB = new Date(b.label);
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate cumulative values
  let cumulativeValue = 0; 
  const cumulativeMap = new Map<string, number>();
  
  chronoSorted.forEach(point => {
    cumulativeValue += point.count;
    cumulativeMap.set(point.label, cumulativeValue);
  });

  // Apply cumulative values to original array order (preserves user's intended sort)
  return dataPoints.map(point => ({
    ...point,
    value: cumulativeMap.get(point.label) || point.count,
  }));
}

/**
 * Formats labels for display
 */
function formatLabel(label: string): string {
  if (label.startsWith('http://') || label.startsWith('https://')) {
    // Extract last part of URL
    const parts = label.split('/');
    return parts[parts.length - 1] || label;
  }
  
  if (label.includes(':')) {
    // Handle namespaced IDs
    const parts = label.split(':');
    return parts[parts.length - 1] || label;
  }
  
  return label;
}

/**
 * Gets available grouping options for a chart configuration (includes reverse relationships)
 */
export function getGroupingOptions(
  normalizedData: NormalizationResult,
  sourceType: string,
  relationshipPath?: string[]
): FieldInfo[] {
  // Get source entities
  const sourceEntities = normalizedData.extracted[sourceType] || [];
  
  if (sourceEntities.length === 0) return [];
  
  // Follow relationship path if specified to get target entities
  const targetEntities = relationshipPath && relationshipPath.length > 0
    ? followRelationshipPath(normalizedData, sourceEntities, relationshipPath)
    : sourceEntities;
  
  if (targetEntities.length === 0) return [];
  
  // Analyze fields of target entities INCLUDING reverse relationships for charting
  return analyzeEntityFieldsForCharting(targetEntities);
}

/**
 * Analyzes all fields available in entities INCLUDING reverse relationships (for chart grouping)
 */
function analyzeEntityFieldsForCharting(entities: NormalizedEntity[]): FieldInfo[] {
  if (!entities || entities.length === 0) return [];
  
  const fieldStats: { [fieldName: string]: FieldInfo } = {};
  
  entities.forEach(entity => {
    Object.entries(entity).forEach(([fieldName, value]) => {
      // Skip JSON-LD @id and @type fields, but INCLUDE reverse relationships
      if (fieldName.startsWith('@')) return;
      
      if (!fieldStats[fieldName]) {
        fieldStats[fieldName] = {
          fieldName,
          type: inferFieldTypeForCharting(fieldName, value),
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
 * Infers the type of a field based on its name and value (for charting, including reverse relationships)
 */
function inferFieldTypeForCharting(fieldName: string, value: any): FieldInfo['type'] {
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
        /^\\d{4}-\\d{2}-\\d{2}/.test(value)) {
      return 'date';
    }
  }
  
  return 'string';
}

/**
 * Gets available numeric fields for aggregation
 */
export function getNumericFields(
  normalizedData: NormalizationResult,
  sourceType: string,
  relationshipPath?: string[]
): FieldInfo[] {
  const allFields = getGroupingOptions(normalizedData, sourceType, relationshipPath);
  return allFields.filter(field => field.type === 'number');
}

/**
 * Gets the target entity types for a grouping field (for reference fields)
 */
export function getGroupingTargetTypes(
  normalizedData: NormalizationResult,
  sourceType: string,
  groupByField: string,
  relationshipPath?: string[]
): string[] {
  // Get source entities
  const sourceEntities = normalizedData.extracted[sourceType] || [];
  
  if (sourceEntities.length === 0) return [];
  
  // Follow relationship path if specified to get target entities
  const targetEntities = relationshipPath && relationshipPath.length > 0
    ? followRelationshipPath(normalizedData, sourceEntities, relationshipPath)
    : sourceEntities;
  
  if (targetEntities.length === 0) return [];
  
  // Look across multiple entities to determine target types, not just the first one
  const targetTypes: string[] = [];
  
  // Examine up to 50 entities to find target types for this field
  const entitiesToCheck = targetEntities.slice(0, 50);
  
  for (let i = 0; i < entitiesToCheck.length; i++) {
    const entity = entitiesToCheck[i];
    const fieldValue = entity[groupByField];
    
    if (fieldValue) {
      if (Array.isArray(fieldValue)) {
        // For array fields, check the type of items
        fieldValue.forEach(item => {
          if (item && typeof item === 'object' && item['@type']) {
            if (!targetTypes.includes(item['@type'])) {
              targetTypes.push(item['@type']);
            }
          }
        });
      } else if (typeof fieldValue === 'object' && fieldValue['@type']) {
        if (!targetTypes.includes(fieldValue['@type'])) {
          targetTypes.push(fieldValue['@type']);
        }
      }
    }
    
    // If we've found target types, we can stop early
    if (targetTypes.length > 0) {
      break;
    }
  }
  
  return targetTypes;
}

/**
 * Gets available label fields for referenced entities
 */
export function getReferenceLabelFields(
  normalizedData: NormalizationResult,
  targetTypes: string[]
): FieldInfo[] {
  const allFields: FieldInfo[] = [];
  
  for (const targetType of targetTypes) {
    const entities = normalizedData.extracted[targetType] || [];
    if (entities.length > 0) {
      const fields = analyzeEntityFields(entities);
      // Only include string fields that are commonly present (good for labels)
      const labelFields = fields.filter(field => 
        field.type === 'string' && field.frequency > 0.5 && !field.fieldName.startsWith('@')
      );
      allFields.push(...labelFields);
    }
  }
  
  // Remove duplicates and sort by frequency
  const uniqueFields = allFields.reduce((acc, field) => {
    const existing = acc.find(f => f.fieldName === field.fieldName);
    if (!existing) {
      acc.push(field);
    }
    return acc;
  }, [] as FieldInfo[]);
  
  return uniqueFields.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Validates a chart configuration
 */
export function validateChartConfig(
  normalizedData: NormalizationResult,
  config: ChartConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if source type exists
  if (!normalizedData.extracted[config.sourceType]) {
    errors.push(`Source type '${config.sourceType}' not found in data`);
  }
  
  // Check if aggregation requires a value field
  if (['sum', 'avg', 'min', 'max'].includes(config.aggregation) && !config.valueField) {
    errors.push(`Aggregation '${config.aggregation}' requires a valueField`);
  }
  
  // Check if relationship path is valid
  if (config.relationshipPath && config.relationshipPath.length > 0) {
    let currentType = config.sourceType;
    for (const relationName of config.relationshipPath) {
      const relationships = discoverRelationships(normalizedData, currentType);
      const relationship = relationships.find(r => r.relationName === relationName);
      if (!relationship) {
        errors.push(`Relationship '${relationName}' not found for type '${currentType}'`);
        break;
      }
      // Use first target type for validation (could be enhanced)
      currentType = relationship.targetTypes[0];
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets available display fields for chart labels (schema-agnostic)
 * Discovers all string fields from target entities without hardcoded assumptions
 */
export function getDisplayableFields(
  normalizedData: NormalizationResult,
  targetTypes: string[]
): FieldInfo[] {
  const allFields: FieldInfo[] = [];
  
  targetTypes.forEach(targetType => {
    const entities = normalizedData.extracted[targetType] || [];
    if (entities.length > 0) {
      const fields = analyzeEntityFields(entities);
      // Get ALL string fields, no hardcoded names
      const stringFields = fields.filter(field => 
        field.type === 'string' && 
        field.fieldName !== '@type' && // Skip @type but allow @id
        field.frequency > 0.3 // Only fields present in 30%+ of entities
      );
      allFields.push(...stringFields);
    }
  });
  
  // Remove duplicates and merge frequency data
  const uniqueFields = allFields.reduce((acc, field) => {
    const existing = acc.find(f => f.fieldName === field.fieldName);
    if (!existing) {
      acc.push(field);
    } else if (field.frequency > existing.frequency) {
      // Replace with higher frequency version
      const index = acc.indexOf(existing);
      acc[index] = field;
    }
    return acc;
  }, [] as FieldInfo[]);
  
  return uniqueFields.sort((a, b) => b.frequency - a.frequency); // Best fields first
}

/**
 * Selects default display field from available options (no hardcoded preferences)
 */
export function selectDefaultDisplayField(availableFields: FieldInfo[]): string | null {
  if (availableFields.length === 0) return null;
  
  // No hardcoded preferences - just use most frequent string field
  return availableFields[0].fieldName;
}

/**
 * Finds best display field from entity dynamically (no hardcoded field names)
 */
export function findBestDisplayField(entity: NormalizedEntity): string | null {
  // No hardcoded field names - find best available string field
  const stringFields = Object.entries(entity)
    .filter(([key, value]) => 
      typeof value === 'string' && 
      !key.startsWith('@') && 
      value.length > 0 && 
      value.length < 100 // Reasonable display length
    )
    .sort((a, b) => a[1].length - b[1].length); // Prefer shorter strings
  
  return stringFields.length > 0 ? stringFields[0][1] : null;
}