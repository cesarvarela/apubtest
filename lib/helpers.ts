/**
 * Generates a UI schema that hides all fields starting with '@' symbol.
 * This is useful for JSON-LD schemas where @-prefixed fields should be hidden from the UI.
 * 
 * @param schema - The JSON schema object
 * @returns UI schema object with hidden @-prefixed fields
 */
export function generateHiddenAtFieldsUiSchema(schema: any): any {
    const uiSchema: any = {};

    // Helper function to check if we're inside a relationship object
    function isPathInRelationshipObject(properties: any, path: string[]): boolean {
        if (path.length === 0) return false;
        
        // Check if current properties structure looks like a relationship object
        const hasIdField = properties?.['@id']?.type === 'string' && properties?.['@id']?.format === 'uri';
        const hasTypeField = properties?.['@type']?.const || properties?.['@type']?.type;
        
        return hasIdField && hasTypeField;
    }

    function hideAtFieldsInProperties(properties: any, path: string[] = []) {
        if (!properties) return;

        Object.keys(properties).forEach(key => {
            if (key.startsWith('@')) {
                // Only hide root-level @-prefixed fields, not ones within relationship objects
                if (path.length === 0) {
                    // This is a root-level @-prefixed field - hide it
                    uiSchema[key] = { 'ui:widget': 'hidden' };
                } else {
                    // This is a nested @-prefixed field (likely in a relationship object)
                    // Check if we're inside a relationship object
                    const isInRelationshipObject = isPathInRelationshipObject(properties, path);
                    
                    if (!isInRelationshipObject) {
                        // Navigate to the correct nested level in uiSchema
                        let current = uiSchema;
                        for (const segment of path) {
                            if (!current[segment]) current[segment] = {};
                            current = current[segment];
                        }
                        current[key] = { 'ui:widget': 'hidden' };
                    }
                    // If it's in a relationship object, don't hide it - let it show normally
                }
            }
        });
    }

    function processProperties(properties: any, path: string[] = []) {
        if (!properties) return;

        hideAtFieldsInProperties(properties, path);

        Object.keys(properties).forEach(key => {
            const prop = properties[key];

            // Handle direct $ref properties
            if (prop.$ref) {
                const refPath = prop.$ref.replace('#/definitions/', '');
                const refDef = schema.definitions?.[refPath];
                if (refDef) {
                    if (refDef.type === 'array' && refDef.items?.properties) {
                        // $ref points to an array definition with items that have properties
                        processProperties(refDef.items.properties, [...path, key, 'items']);
                    } else if (refDef.properties) {
                        // $ref points to an object definition with properties
                        processProperties(refDef.properties, [...path, key]);
                    }
                }
            }
            // Handle arrays with items
            else if (prop.type === 'array' && prop.items) {
                if (prop.items.properties) {
                    // Direct array items with properties
                    processProperties(prop.items.properties, [...path, key, 'items']);
                } else if (prop.items.$ref) {
                    // Array items with $ref - resolve and process
                    const refPath = prop.items.$ref.replace('#/definitions/', '');
                    const refDef = schema.definitions?.[refPath];
                    if (refDef?.type === 'array' && refDef.items?.properties) {
                        processProperties(refDef.items.properties, [...path, key, 'items']);
                    }
                }
            }
        });
    }

    // Process main schema properties
    if (schema.properties) {
        processProperties(schema.properties);
    }

    console.log('Generated uiSchema:', JSON.stringify(uiSchema, null, 2));
    return uiSchema;
}

/**
 * Merges core and local schemas into a single schema object.
 * This function flattens the allOf structure from the local schema and combines
 * properties and required fields from both schemas.
 * 
 * @param coreSchema - The core schema object
 * @param localSchema - The local schema object (may contain allOf structure)
 * @returns Merged schema object
 */
export function mergeSchemas(coreSchema: any, localSchema: any): any {
    // Handle null/undefined schemas
    const core = coreSchema || {};
    const local = localSchema || {};

    return {
        $id: local.$id,
        definitions: local.definitions,
        type: 'object',
        properties: {
            // core may define its own @-prefixed fields
            ...(core.properties || {}),
            // local is defined by the node
            ...(local.allOf?.[1]?.properties || {}),
        },
        required: [
            ...(core.required || []),
            ...(local.allOf?.[1]?.required || []),
        ],
        additionalProperties: false,
    };
}