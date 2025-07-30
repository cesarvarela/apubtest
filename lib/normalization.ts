/**
 * Normalization utilities for JSON-LD data
 */

export interface NormalizedEntity {
  '@type': string;
  '@id': string;
  [key: string]: any;
  // Reverse relationships will be added dynamically with 'reverse_' prefix
  // e.g., reverse_authors: EntityReference[]
  // e.g., reverse_reports: EntityReference[]
  // e.g., reverse_deployedBy: EntityReference[]
}

export interface EntityReference {
  '@type': string;
  '@id': string;
}

export interface NormalizationResult {
  normalized: EntityReference | EntityReference[] | null;
  extracted: { [type: string]: NormalizedEntity[] };
}

/**
 * Normalizes JSON-LD data by extracting all entities and returning a structure
 * with simplified references in the root and full entities organized by type.
 * 
 * @param compactData - The compact JSON-LD data to normalize
 * @returns Object containing normalized root with references and extracted entities by type
 */
export function normalizeEntities(compactData: any): NormalizationResult {
  if (!compactData) {
    return { normalized: null, extracted: {} };
  }

  const extractedEntities: { [type: string]: NormalizedEntity[] } = {};
  const visited = new Set<string>();

  function extractEntity(data: any): EntityReference | any {
    if (!data || typeof data !== 'object') return data;

    const id = data['@id'];
    const type = data['@type'];
    
    if (!id || !type) return data;

    // If already visited, return reference
    if (visited.has(id)) {
      return { '@type': type, '@id': id };
    }

    visited.add(id);

    // Create full entity for extraction
    const fullEntity: NormalizedEntity = { '@type': type, '@id': id };
    
    // Process all properties
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('@')) return;

      if (Array.isArray(value)) {
        const processedArray: any[] = [];
        value.forEach((item: any) => {
          if (item && typeof item === 'object' && item['@id']) {
            processedArray.push(extractEntity(item));
          } else {
            processedArray.push(item);
          }
        });
        fullEntity[key] = processedArray;
      } else if (value && typeof value === 'object' && (value as any)['@id']) {
        fullEntity[key] = extractEntity(value);
      } else {
        fullEntity[key] = value;
      }
    });

    // Add to extracted entities by type
    if (!extractedEntities[type]) {
      extractedEntities[type] = [];
    }
    extractedEntities[type].push(fullEntity);

    // Return reference for nested usage
    return { '@type': type, '@id': id };
  }

  // Process root entities and add them to extracted entities as well
  let normalizedRoot: EntityReference | EntityReference[] | null;
  
  if (Array.isArray(compactData)) {
    const normalizedArray = compactData.map(item => {
      if (item && typeof item === 'object' && item['@id'] && item['@type']) {
        // Extract root entity just like nested entities
        extractEntity(item);
        // Return only the reference for the normalized root
        return { '@type': item['@type'], '@id': item['@id'] };
      }
      return item;
    });
    normalizedRoot = normalizedArray.length === 1 ? normalizedArray[0] : normalizedArray;
  } else {
    if (compactData && typeof compactData === 'object' && compactData['@id'] && compactData['@type']) {
      // Extract root entity
      extractEntity(compactData);
      // Return only the reference for the normalized root
      normalizedRoot = { '@type': compactData['@type'], '@id': compactData['@id'] };
    } else {
      normalizedRoot = compactData;
    }
  }

  // Create reverse relationships after all entities are extracted
  createReverseRelationships(extractedEntities);

  return {
    normalized: normalizedRoot,
    extracted: extractedEntities
  };
}

/**
 * Creates reverse relationships for all entities in the extracted collection.
 * For each forward relationship, creates a corresponding reverse relationship.
 */
function createReverseRelationships(extractedEntities: { [type: string]: NormalizedEntity[] }): void {
  // Iterate through all entities and their relationships
  Object.values(extractedEntities).forEach(entityTypeArray => {
    entityTypeArray.forEach(entity => {
      // Process each property that contains entity references
      Object.entries(entity).forEach(([key, value]) => {
        if (key.startsWith('@') || key.startsWith('reverse_')) return;
        
        // Handle array of references
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            if (item && typeof item === 'object' && item['@type'] && item['@id']) {
              addReverseRelationship(extractedEntities, item['@type'], item['@id'], key, entity);
            }
          });
        }
        // Handle single reference
        else if (value && typeof value === 'object' && value['@type'] && value['@id']) {
          addReverseRelationship(extractedEntities, value['@type'], value['@id'], key, entity);
        }
      });
    });
  });
}

/**
 * Adds a reverse relationship to the target entity.
 */
function addReverseRelationship(
  extractedEntities: { [type: string]: NormalizedEntity[] },
  targetType: string,
  targetId: string,
  relationshipName: string,
  sourceEntity: NormalizedEntity
): void {
  // Find the target entity
  const targetTypeArray = extractedEntities[targetType];
  if (!targetTypeArray) return;
  
  const targetEntity = targetTypeArray.find(entity => entity['@id'] === targetId);
  if (!targetEntity) return;
  
  // Create reverse relationship name
  const reverseRelationshipName = `reverse_${relationshipName}`;
  
  // Initialize reverse relationship array if it doesn't exist
  if (!targetEntity[reverseRelationshipName]) {
    targetEntity[reverseRelationshipName] = [];
  }
  
  // Create reference to source entity
  const sourceReference = {
    '@type': sourceEntity['@type'],
    '@id': sourceEntity['@id']
  };
  
  // Add reverse relationship if it doesn't already exist
  const reverseArray = targetEntity[reverseRelationshipName] as EntityReference[];
  const exists = reverseArray.some(ref => 
    ref['@type'] === sourceReference['@type'] && ref['@id'] === sourceReference['@id']
  );
  
  if (!exists) {
    reverseArray.push(sourceReference);
  }
}