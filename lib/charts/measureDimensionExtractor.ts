/**
 * Modern chart data extraction for measure/dimension model
 * Clean implementation without legacy dependencies
 */

import { ChartConfig, ChartData, EntityCollection, NormalizedEntity } from '@/types/charts';
import { formatFieldLabel, formatChartAxisLabel } from './labelGenerator';

/**
 * Extracts chart data using the measure/dimension model
 */
export function extractChartData(
  entities: EntityCollection,
  config: ChartConfig
): ChartData {
  // Get measure entities (what we're counting/measuring)
  const measureEntityIds = entities.types[config.measure.entity] || [];
  const measureEntities = measureEntityIds.map(id => entities.entities[id]);

  if (measureEntities.length === 0) {
    return {
      data: [],
      measureLabel: formatChartAxisLabel(config.measure.aggregation, config.measure.entity, config.measure.field),
      dimensionLabel: formatFieldLabel(config.dimension.field)
    };
  }

  // Follow relationship if specified (via field)
  let targetEntities = measureEntities;
  if (config.dimension.via) {
    targetEntities = [];
    measureEntities.forEach(entity => {
      const relationshipTargets = entity.relationships[config.dimension.via!] || [];
      relationshipTargets.forEach(targetId => {
        const targetEntity = entities.entities[targetId];
        if (targetEntity && targetEntity.type === config.dimension.entity) {
          targetEntities.push(targetEntity);
        }
      });
    });
  } else if (config.dimension.entity !== config.measure.entity) {
    // Direct dimension entity (different from measure entity)
    const dimensionEntityIds = entities.types[config.dimension.entity] || [];
    targetEntities = dimensionEntityIds.map(id => entities.entities[id]);
  }

  // Group by dimension field
  const groups: { [key: string]: NormalizedEntity[] } = {};
  
  targetEntities.forEach(entity => {
    const dimensionValue = entity.properties[config.dimension.field];
    let groupKey: string;
    
    if (dimensionValue === null || dimensionValue === undefined) {
      groupKey = '(Not specified)';
    } else if (Array.isArray(dimensionValue)) {
      // Handle array values - create entry for each item
      dimensionValue.forEach(item => {
        const key = String(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(entity);
      });
      return;
    } else {
      groupKey = String(dimensionValue);
    }
    
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(entity);
  });

  // Apply aggregation
  let chartData = Object.entries(groups).map(([label, groupEntities]) => {
    let value: number;
    
    switch (config.measure.aggregation) {
      case 'count':
        value = groupEntities.length;
        break;
      case 'sum':
        value = groupEntities.reduce((sum, entity) => {
          const fieldValue = config.measure.field ? entity.properties[config.measure.field] : 0;
          return sum + (Number(fieldValue) || 0);
        }, 0);
        break;
      case 'avg':
        const sum = groupEntities.reduce((sum, entity) => {
          const fieldValue = config.measure.field ? entity.properties[config.measure.field] : 0;
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
      entities: groupEntities.map(e => ({ '@type': e.type, '@id': e.id }))
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