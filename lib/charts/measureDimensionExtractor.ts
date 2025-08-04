/**
 * Chart data extraction for measure/dimension model
 * Works directly with normalized JSON-LD data
 */

import { ChartConfig, ChartData } from '@/types/charts';
import { NormalizationResult, NormalizedEntity } from '@/lib/normalization';
import { formatFieldLabel, formatChartAxisLabel } from './labelGenerator';

/**
 * Helper function to resolve entity references to their display names
 */
function resolveEntityReference(
  ref: any,
  normalizedData: NormalizationResult
): string {
  // Check if this is an entity reference
  if (!ref || typeof ref !== 'object' || !ref['@type'] || !ref['@id']) {
    return String(ref);
  }

  // Try to find the entity in the normalized data
  const entityType = ref['@type'];
  const entityId = ref['@id'];
  const entities = normalizedData.extracted[entityType];
  
  if (entities) {
    const entity = entities.find(e => e['@id'] === entityId);
    if (entity) {
      // Look for common display name fields
      if (entity.name) return String(entity.name);
      if (entity.title) return String(entity.title);
      if (entity.label) return String(entity.label);
    }
  }
  
  // Fallback to the @id (extract last part for readability)
  const idParts = entityId.split('/');
  return idParts[idParts.length - 1] || entityId;
}

/**
 * Extracts chart data using the measure/dimension model
 */
export function extractChartData(
  normalizedData: NormalizationResult,
  config: ChartConfig
): ChartData {
  // Get measure entities (what we're counting/measuring)
  const measureEntities = normalizedData.extracted[config.measure.entity] || [];

  if (measureEntities.length === 0) {
    return {
      data: [],
      measureLabel: formatChartAxisLabel(config.measure.aggregation, config.measure.entity, config.measure.field),
      dimensionLabel: formatFieldLabel(config.dimension.field)
    };
  }

  // Follow relationship if specified (via field)
  let targetEntities: NormalizedEntity[] = measureEntities;
  if (config.dimension.via) {
    targetEntities = [];
    const allDimensionEntities = normalizedData.extracted[config.dimension.entity] || [];
    const viaField = config.dimension.via; // Capture it in a const
    
    measureEntities.forEach(entity => {
      const relationshipTargets = entity[viaField] || [];
      const targetIds = Array.isArray(relationshipTargets) 
        ? relationshipTargets.map(ref => ref['@id'] || ref)
        : [relationshipTargets['@id'] || relationshipTargets];
      
      targetIds.forEach(targetId => {
        const targetEntity = allDimensionEntities.find(e => e['@id'] === targetId);
        if (targetEntity) {
          targetEntities.push(targetEntity);
        }
      });
    });
  } else if (config.dimension.entity !== config.measure.entity) {
    // Direct dimension entity (different from measure entity)
    targetEntities = normalizedData.extracted[config.dimension.entity] || [];
  }

  // Group by dimension field
  const groups: { [key: string]: NormalizedEntity[] } = {};
  
  targetEntities.forEach(entity => {
    const dimensionValue = entity[config.dimension.field];
    let groupKey: string;
    
    if (dimensionValue === null || dimensionValue === undefined) {
      groupKey = '(Not specified)';
    } else if (Array.isArray(dimensionValue)) {
      // Handle array values - create entry for each item
      dimensionValue.forEach(item => {
        const key = resolveEntityReference(item, normalizedData);
        if (!groups[key]) groups[key] = [];
        groups[key].push(entity);
      });
      return;
    } else {
      groupKey = resolveEntityReference(dimensionValue, normalizedData);
    }
    
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(entity);
  });

  // Apply aggregation
  let chartData = Object.entries(groups).map(([label, groupEntities]) => {
    let value: number;
    
    switch (config.measure.aggregation) {
      case 'count':
      case 'cumulative': // Will be processed after sorting
        value = groupEntities.length;
        break;
      case 'sum':
        value = groupEntities.reduce((sum, entity) => {
          const fieldValue = config.measure.field ? entity[config.measure.field] : 0;
          return sum + (Number(fieldValue) || 0);
        }, 0);
        break;
      case 'avg':
        const sum = groupEntities.reduce((sum, entity) => {
          const fieldValue = config.measure.field ? entity[config.measure.field] : 0;
          return sum + (Number(fieldValue) || 0);
        }, 0);
        value = groupEntities.length > 0 ? sum / groupEntities.length : 0;
        break;
      default:
        value = groupEntities.length;
    }

    return {
      [config.dimension.field]: label,
      value,
      count: groupEntities.length,
      entities: groupEntities.map(e => ({ '@type': e['@type'], '@id': e['@id'] }))
    };
  });

  // Apply sorting
  if (config.sortBy === 'measure') {
    chartData.sort((a, b) => config.sortOrder === 'desc' ? b.value - a.value : a.value - b.value);
  } else {
    chartData.sort((a, b) => {
      const aLabel = String(a[config.dimension.field]);
      const bLabel = String(b[config.dimension.field]);
      return config.sortOrder === 'desc' ? bLabel.localeCompare(aLabel) : aLabel.localeCompare(bLabel);
    });
  }

  // Apply cumulative calculation if needed
  if (config.measure.aggregation === 'cumulative') {
    // Sort chronologically for cumulative calculation
    const chronoSorted = [...chartData].sort((a, b) => {
      const aLabel = String(a[config.dimension.field]);
      const bLabel = String(b[config.dimension.field]);
      
      // Try to parse as dates
      const dateA = new Date(aLabel);
      const dateB = new Date(bLabel);
      
      // If both are valid dates, sort chronologically
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Otherwise sort alphabetically
      return aLabel.localeCompare(bLabel);
    });
    
    // Calculate cumulative values
    let cumulativeValue = 0;
    const cumulativeMap = new Map<string, number>();
    
    chronoSorted.forEach(dataPoint => {
      cumulativeValue += dataPoint.count;
      cumulativeMap.set(String(dataPoint[config.dimension.field]), cumulativeValue);
    });
    
    // Apply cumulative values to original array (preserves user's sort order)
    chartData = chartData.map(dataPoint => ({
      ...dataPoint,
      value: cumulativeMap.get(String(dataPoint[config.dimension.field])) || dataPoint.value
    }));
  }

  // Apply top N limit
  if (config.topN && config.topN > 0) {
    chartData = chartData.slice(0, config.topN);
  }

  return {
    data: chartData,
    measureLabel: formatChartAxisLabel(config.measure.aggregation, config.measure.entity, config.measure.field),
    dimensionLabel: config.dimension.via 
      ? `${formatFieldLabel(config.dimension.field)} (via ${formatFieldLabel(config.dimension.via)})`
      : formatFieldLabel(config.dimension.field)
  };
}