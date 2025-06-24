import { SchemaGenerator } from '@/lib/schemas';
import { NextResponse } from 'next/server';

interface PropertyInfo {
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    format?: string;
    minLength?: number;
    maxLength?: number;
    const?: string;
    mapping?: string;
    items?: any;
}

interface VocabData {
    localSchema: {
        properties: PropertyInfo[];
        definitions: Record<string, {
            type: string;
            properties: PropertyInfo[];
        }>;
    };
    localContext: {
        mappings: Record<string, string | { '@id': string; '@type'?: string; '@container'?: string }>;
    };
}

function extractPropertiesFromSchema(schema: any, contextMappings: Record<string, any> = {}): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    
    if (!schema || typeof schema !== 'object') {
        return properties;
    }

    // Handle allOf schemas (like the local schema that extends core)
    if (schema.allOf) {
        for (const subSchema of schema.allOf) {
            if (subSchema.properties) {
                properties.push(...extractPropertiesFromSchema(subSchema, contextMappings));
            }
        }
        return properties;
    }

    // Extract properties from the schema
    if (schema.properties) {
        for (const [propName, propDef] of Object.entries(schema.properties as Record<string, any>)) {
            const property: PropertyInfo = {
                name: propName,
                type: propDef.type,
                description: propDef.description,
                required: schema.required?.includes(propName) || false,
                format: propDef.format,
                minLength: propDef.minLength,
                maxLength: propDef.maxLength,
                const: propDef.const,
                items: propDef.items
            };

            // Add context mapping if available
            if (contextMappings[propName]) {
                const mapping = contextMappings[propName];
                if (typeof mapping === 'string') {
                    property.mapping = mapping;
                } else if (typeof mapping === 'object' && mapping['@id']) {
                    property.mapping = mapping['@id'];
                    if (mapping['@container']) {
                        property.mapping += ` (container: ${mapping['@container']})`;
                    }
                }
            }

            properties.push(property);
        }
    }

    return properties;
}

function extractContextMappings(context: any): Record<string, any> {
    const mappings: Record<string, any> = {};
    
    if (!context || typeof context !== 'object') {
        return mappings;
    }

    // Handle @context array
    if (context['@context']) {
        const contextData = context['@context'];
        if (Array.isArray(contextData)) {
            // Find the local context object (not the string URLs)
            for (const item of contextData) {
                if (typeof item === 'object' && !Array.isArray(item)) {
                    Object.assign(mappings, item);
                }
            }
        } else if (typeof contextData === 'object') {
            Object.assign(mappings, contextData);
        }
    }

    return mappings;
}

export async function GET() {
    try {
        if (!process.env.CORE_DOMAIN || !process.env.LOCAL_DOMAIN || !process.env.NAMESPACE) {
            return NextResponse.json(
                { error: 'Missing required environment variables' },
                { status: 500 }
            );
        }

        const schemasGenerator = new SchemaGenerator(
            process.env.CORE_DOMAIN,
            process.env.LOCAL_DOMAIN,
            process.env.NAMESPACE
        );

        const [localSchema, localContext] = await Promise.all([
            schemasGenerator.getLocalSchema().catch(() => null),
            schemasGenerator.getLocalContext().catch(() => null),
        ]);

        if (!localSchema || !localContext) {
            return NextResponse.json(
                { 
                    error: 'Local schema or context not found',
                    hasSchema: !!localSchema,
                    hasContext: !!localContext 
                },
                { status: 404 }
            );
        }

        // Extract context mappings
        const contextMappings = extractContextMappings(localContext);

        // Extract properties from local schema
        const properties = extractPropertiesFromSchema(localSchema, contextMappings);

        // Extract definitions (like reportArray)
        const definitions: Record<string, any> = {};
        if (localSchema.definitions) {
            for (const [defName, defSchema] of Object.entries(localSchema.definitions as Record<string, any>)) {
                definitions[defName] = {
                    type: defSchema.type,
                    properties: extractPropertiesFromSchema(defSchema, contextMappings)
                };
            }
        }

        const vocabData: VocabData = {
            localSchema: {
                properties,
                definitions
            },
            localContext: {
                mappings: contextMappings
            }
        };

        return NextResponse.json(vocabData);

    } catch (error) {
        console.error('Error fetching vocab data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vocabulary data' },
            { status: 500 }
        );
    }
}
