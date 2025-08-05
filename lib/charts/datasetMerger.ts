/**
 * Utilities for merging multiple normalized datasets
 */

import { NormalizationResult, NormalizedEntity } from '../normalization';

/**
 * Merges multiple normalized datasets by matching entities on type + id
 * Entities with the same @type and @id are merged together
 */
export function mergeNormalizedDatasets(
  datasetIds: string[], 
  normalizedDatasets: Record<string, NormalizationResult>
): NormalizationResult {
  if (datasetIds.length === 0) {
    return { normalized: null, extracted: {} };
  }
  
  // If only one dataset, return it directly
  if (datasetIds.length === 1) {
    return normalizedDatasets[datasetIds[0]];
  }
  
  const entityMap = new Map<string, NormalizedEntity>();
  
  // Process each dataset
  datasetIds.forEach(datasetId => {
    const dataset = normalizedDatasets[datasetId];
    if (!dataset) return;
    
    // Process each entity type
    Object.entries(dataset.extracted).forEach(([type, entities]) => {
      entities.forEach(entity => {
        const key = `${entity['@type']}::${entity['@id']}`;
        
        if (entityMap.has(key)) {
          // Merge with existing entity
          const existing = entityMap.get(key)!;
          entityMap.set(key, mergeEntityProperties(existing, entity));
        } else {
          // New entity - create a copy
          entityMap.set(key, { ...entity });
        }
      });
    });
  });
  
  // Convert back to normalized structure grouped by type
  const mergedExtracted: { [type: string]: NormalizedEntity[] } = {};
  entityMap.forEach(entity => {
    const type = entity['@type'];
    if (!mergedExtracted[type]) {
      mergedExtracted[type] = [];
    }
    mergedExtracted[type].push(entity);
  });
  
  return { normalized: null, extracted: mergedExtracted };
}

/**
 * Merges properties from two entities with the same type and id
 */
function mergeEntityProperties(
  existing: NormalizedEntity, 
  incoming: NormalizedEntity
): NormalizedEntity {
  const merged = { ...existing };
  
  Object.entries(incoming).forEach(([key, value]) => {
    // Skip type and id as they must match
    if (key === '@type' || key === '@id') return;
    
    if (key.startsWith('reverse_')) {
      // Always concatenate reverse relationships
      const existingArray = (existing[key] || []) as any[];
      const incomingArray = (value || []) as any[];
      merged[key] = [...existingArray, ...incomingArray];
    } else if (Array.isArray(value)) {
      // Concatenate arrays (could add deduplication logic here if needed)
      const existingArray = (existing[key] || []) as any[];
      merged[key] = [...existingArray, ...value];
    } else if (typeof value === 'object' && value !== null && !value['@type']) {
      // Deep merge plain objects (not entity references)
      merged[key] = {
        ...(existing[key] as any || {}),
        ...value
      };
    } else {
      // Simple values - incoming wins
      merged[key] = value;
    }
  });
  
  return merged;
}

/**
 * Gets statistics about the merge operation
 */
export function getMergeStatistics(
  datasetIds: string[],
  normalizedDatasets: Record<string, NormalizationResult>
): {
  totalEntities: number;
  sharedEntities: number;
  uniqueByDataset: Record<string, number>;
} {
  const entityKeys = new Map<string, Set<string>>();
  
  // Collect all entity keys per dataset
  datasetIds.forEach(datasetId => {
    const dataset = normalizedDatasets[datasetId];
    if (!dataset) return;
    
    const keys = new Set<string>();
    Object.entries(dataset.extracted).forEach(([type, entities]) => {
      entities.forEach(entity => {
        keys.add(`${entity['@type']}::${entity['@id']}`);
      });
    });
    entityKeys.set(datasetId, keys);
  });
  
  // Find shared entities (appear in 2+ datasets)
  const allKeys = new Set<string>();
  const keyFrequency = new Map<string, number>();
  
  entityKeys.forEach(keys => {
    keys.forEach(key => {
      allKeys.add(key);
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
    });
  });
  
  const sharedEntities = Array.from(keyFrequency.values()).filter(freq => freq > 1).length;
  
  // Calculate unique entities per dataset
  const uniqueByDataset: Record<string, number> = {};
  entityKeys.forEach((keys, datasetId) => {
    let uniqueCount = 0;
    keys.forEach(key => {
      if (keyFrequency.get(key) === 1) {
        uniqueCount++;
      }
    });
    uniqueByDataset[datasetId] = uniqueCount;
  });
  
  return {
    totalEntities: allKeys.size,
    sharedEntities,
    uniqueByDataset
  };
}