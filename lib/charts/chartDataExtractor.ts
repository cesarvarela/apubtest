import { ChartConfig, ChartData, EntityCollection, NormalizedEntity, ChartMeasure, ChartDimension } from '@/types/charts';

/**
 * Extracts chart data using the measure/dimension model
 */
export function extractChartData(entityCollection: EntityCollection, config: ChartConfig): ChartData {
  console.log('extractChartData called with:', {
    totalEntities: Object.keys(entityCollection.entities).length,
    measureEntity: config.measure.entity,
    dimensionEntity: config.dimension.entity,
    relationshipVia: config.dimension.via
  });

  // Get all entities of the measure type (what we're counting)
  const measureEntities = getMeasureEntities(entityCollection, config.measure.entity);
  
  if (measureEntities.length === 0) {
    console.log('No measure entities found for:', config.measure.entity);
    return { data: [], measureLabel: '', dimensionLabel: '' };
  }

  console.log('Found measure entities:', measureEntities.length);

  // Group measure entities by dimension values
  const groupedData = groupByDimension(entityCollection, measureEntities, config);
  
  // Apply aggregation
  const aggregatedData = applyAggregation(groupedData, config);
  
  // Apply sorting and filtering
  const finalData = applySortingAndFiltering(aggregatedData, config);

  const measureLabel = getMeasureLabel(config.measure);
  const dimensionLabel = getDimensionLabel(config.dimension);

  return {
    data: finalData,
    measureLabel,
    dimensionLabel
  };
}

/**
 * Get all entities of the specified measure type
 */
function getMeasureEntities(entityCollection: EntityCollection, measureEntityType: string): NormalizedEntity[] {
  const entityIds = entityCollection.types[measureEntityType] || [];
  const entities = entityIds.map(id => entityCollection.entities[id]).filter(Boolean);
  
  // Log entity count for debugging
  console.log(`Found ${entities.length} entities of type ${measureEntityType}`);
  
  return entities;
}

/**
 * Group measure entities by dimension values
 */
function groupByDimension(
  entityCollection: EntityCollection, 
  measureEntities: NormalizedEntity[], 
  config: ChartConfig
): Map<string, NormalizedEntity[]> {
  const groups = new Map<string, NormalizedEntity[]>();

  measureEntities.forEach(measureEntity => {
    const dimensionValues = getDimensionValues(entityCollection, measureEntity, config.dimension);
    
    // Handle cases where one measure entity can belong to multiple dimension values
    dimensionValues.forEach(dimensionValue => {
      if (!groups.has(dimensionValue)) {
        groups.set(dimensionValue, []);
      }
      groups.get(dimensionValue)!.push(measureEntity);
    });
  });

  console.log('Grouped data:', {
    groupCount: groups.size,
    groups: Array.from(groups.entries()).map(([key, entities]) => ({
      dimension: key,
      count: entities.length
    }))
  });

  return groups;
}

/**
 * Get dimension values for a measure entity
 */
function getDimensionValues(
  entityCollection: EntityCollection,
  measureEntity: NormalizedEntity,
  dimension: ChartDimension
): string[] {
  // Same entity - get dimension value directly from the measure entity
  if (dimension.entity === measureEntity.type) {
    const value = getEntityFieldValue(measureEntity, dimension.field);
    
    // DEBUG: Log same-entity field extraction for dates
    if (dimension.field === 'date') {
      console.log('Same-entity date extraction:', {
        entityId: measureEntity.id,
        fieldRequested: dimension.field,
        properties: Object.keys(measureEntity.properties),
        dateProperty: measureEntity.properties.date,
        extractedValue: value,
        sampleProperties: measureEntity.properties
      });
    }
    
    return value ? [formatDimensionValue(value, dimension.field)] : ['Unknown'];
  }

  // Different entity - follow relationship path
  if (!dimension.via) {
    console.warn('Cross-entity dimension requires "via" relationship path');
    return ['Unknown'];
  }

  return getRelatedDimensionValues(entityCollection, measureEntity, dimension);
}

/**
 * Get dimension values by following relationships
 */
function getRelatedDimensionValues(
  entityCollection: EntityCollection,
  measureEntity: NormalizedEntity,
  dimension: ChartDimension
): string[] {
  if (!dimension.via) {
    return ['Unknown relationship'];
  }

  // Generate possible relationship key variations
  const possibleKeys = generateRelationshipKeyVariations(dimension.via);
  
  let relationshipIds: string[] = [];
  for (const key of possibleKeys) {
    if (measureEntity.relationships[key] && measureEntity.relationships[key].length > 0) {
      relationshipIds = measureEntity.relationships[key];
      break;
    }
  }
  
  // Log successful relationship key discovery for debugging
  if (relationshipIds.length === 0) {
    console.log('No relationships found. Available keys:', Object.keys(measureEntity.relationships));
  }
  
  if (relationshipIds.length === 0) {
    return ['No ' + (dimension.via || 'relationship')];
  }

  const values: string[] = [];
  
  relationshipIds.forEach((relatedId: string) => {
    const relatedEntity = entityCollection.entities[relatedId];
    
    if (relatedEntity && relatedEntity.type === dimension.entity) {
      const value = getEntityFieldValue(relatedEntity, dimension.field);
      if (value) {
        values.push(formatDimensionValue(value, dimension.field));
      }
    }
  });

  return values.length > 0 ? values : ['Unknown ' + dimension.entity];
}

/**
 * Get field value from an entity using dynamic field resolution
 */
function getEntityFieldValue(entity: NormalizedEntity, fieldName: string): any {
  return findFieldValue(entity.properties, fieldName);
}

/**
 * Dynamically find field value by trying different key variations
 */
function findFieldValue(properties: Record<string, any>, targetField: string): any {
  // Direct match first
  if (properties[targetField] !== undefined) {
    return properties[targetField];
  }

  // Generate possible key variations for the target field
  const possibleKeys = generateFieldKeyVariations(targetField);
  
  for (const key of possibleKeys) {
    if (properties[key] !== undefined) {
      return properties[key];
    }
  }

  // Special fallback logic for common fields
  if (targetField === 'name') {
    return properties.name || properties.title || properties.incidentId || 'Unnamed';
  }
  
  if (targetField === 'title') {
    return properties.title || properties.name || 'Untitled';
  }

  return undefined;
}

/**
 * Generate possible key variations for a field name
 */
function generateFieldKeyVariations(fieldName: string): string[] {
  const variations = [
    fieldName, // Original
    `aiid:${fieldName}`, // Prefixed with aiid
    `core:${fieldName}`, // Prefixed with core
    `https://example.org/aiid#${fieldName}`, // Full aiid URI
    `https://example.org/core#${fieldName}`, // Full core URI
    `https://schema.org/${fieldName}`, // Schema.org URI
  ];

  // Add common aliases for specific fields
  if (fieldName === 'date') {
    variations.push('incident_date', 'dateOccurred', 'timestamp');
  }
  
  if (fieldName === 'name') {
    variations.push('title', 'label');
  }
  
  if (fieldName === 'id') {
    variations.push('incident_id', 'incidentId', 'identifier');
  }

  return variations;
}

/**
 * Generate possible key variations for a relationship name
 */
function generateRelationshipKeyVariations(relationshipName: string): string[] {
  const variations = [
    relationshipName, // Original compact form (e.g., "deployedBy")
    `aiid:${relationshipName}`, // Prefixed form (e.g., "aiid:deployedBy") 
    `https://example.org/aiid#${relationshipName}`, // Full expanded URI form
    `core:${relationshipName}`, // Core namespace form
    `https://example.org/core#${relationshipName}`, // Core expanded URI form
    `_reverse_${relationshipName}`, // Reverse relationship (e.g., "_reverse_reports")
    `_reverse_aiid:${relationshipName}`, // Reverse prefixed form
    `_reverse_https://example.org/aiid#${relationshipName}`, // Reverse expanded URI form
    `_reverse_core:${relationshipName}`, // Reverse core namespace form
    `_reverse_https://example.org/core#${relationshipName}`, // Reverse core expanded URI form
  ];

  return variations;
}

/**
 * Format dimension value for display
 */
function formatDimensionValue(value: any, fieldName: string): string {
  if (fieldName === 'date' && value) {
    // Group dates by year for better visualization
    const date = new Date(value);
    return date.getFullYear().toString();
  }
  
  return String(value);
}

/**
 * Apply aggregation to grouped data
 */
function applyAggregation(
  groupedData: Map<string, NormalizedEntity[]>,
  config: ChartConfig
): Array<{ dimension: string; measure: number }> {
  const results: Array<{ dimension: string; measure: number }> = [];

  groupedData.forEach((entities, dimensionValue) => {
    let measureValue: number;

    switch (config.measure.aggregation) {
      case 'count':
        measureValue = entities.length;
        break;
      case 'sum':
        if (!config.measure.field) {
          measureValue = entities.length; // Fallback to count
        } else {
          const fieldName = config.measure.field;
          measureValue = entities.reduce((sum, entity) => {
            const value = getEntityFieldValue(entity, fieldName);
            return sum + (Number(value) || 0);
          }, 0);
        }
        break;
      case 'average':
        if (!config.measure.field) {
          measureValue = 1; // Average of counts doesn't make much sense
        } else {
          const fieldName = config.measure.field;
          const sum = entities.reduce((sum, entity) => {
            const value = getEntityFieldValue(entity, fieldName);
            return sum + (Number(value) || 0);
          }, 0);
          measureValue = entities.length > 0 ? sum / entities.length : 0;
        }
        break;
      default:
        measureValue = entities.length;
    }

    results.push({
      dimension: dimensionValue,
      measure: measureValue
    });
  });

  return results;
}

/**
 * Apply sorting and filtering to final data
 */
function applySortingAndFiltering(
  data: Array<{ dimension: string; measure: number }>,
  config: ChartConfig
): Array<{ [key: string]: any }> {
  // Sort data
  data.sort((a, b) => {
    let comparison = 0;

    if (config.sortBy === 'dimension') {
      comparison = a.dimension.localeCompare(b.dimension);
    } else {
      comparison = a.measure - b.measure;
    }

    return config.sortOrder === 'desc' ? -comparison : comparison;
  });

  // Apply top N filter
  if (config.topN && data.length > config.topN) {
    data = data.slice(0, config.topN);
  }

  // Transform to chart format
  return data.map(item => ({
    [config.dimension.field]: item.dimension,
    measure: item.measure
  }));
}

/**
 * Generate measure label for charts
 */
function getMeasureLabel(measure: ChartMeasure): string {
  const entityName = measure.entity.split(':')[1] || measure.entity;
  
  switch (measure.aggregation) {
    case 'count':
      return `Count of ${entityName}`;
    case 'sum':
      return `Sum of ${measure.field || entityName}`;
    case 'average':
      return `Average ${measure.field || entityName}`;
    default:
      return entityName;
  }
}

/**
 * Generate dimension label for charts
 */
function getDimensionLabel(dimension: ChartDimension): string {
  const entityName = dimension.entity.split(':')[1] || dimension.entity;
  return `${entityName} (${dimension.field})`;
}

// ChartDimension is now imported at the top of the file