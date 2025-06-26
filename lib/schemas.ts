import { SchemaObject } from "ajv";
import { db } from "../db";
import { Schema } from "../db/schema";
import { eq, and } from "drizzle-orm";

export class SchemaNotFoundError extends Error {
    constructor(
        public schemaType: 'core' | 'local',
        public contentType: 'schema' | 'context' | 'vocab',
        public namespace?: string
    ) {
        const namespaceText = namespace ? ` for namespace "${namespace}"` : '';
        super(`${schemaType} ${contentType}${namespaceText} not found in database. Please configure it at /schema/manage`);
        this.name = 'SchemaNotFoundError';
    }
}

export class SchemaGenerator {

    constructor(
        public coreDomain: string,
        public localDomain: string,
        public namespace: string
    ) {
        const missing: string[] = [];
        if (!coreDomain) missing.push('coreDomain');
        if (!localDomain) missing.push('localDomain');
        if (!namespace) missing.push('namespace');

        if (missing.length) {
            throw new Error(`Missing required parameter(s): ${missing.join(', ')}`);
        }
    }

    getSchemaUrl(type: 'validation' | 'context' | 'vocab', namespace: string): string {
        const domain = namespace === 'core' ? this.coreDomain : this.localDomain;
        
        switch (type) {
            case 'validation':
                return namespace === 'core' 
                    ? `${domain}/schemas/core-schema.json`
                    : `${domain}/schema/${namespace}-v1.json`;
            case 'context':
                return namespace === 'core' 
                    ? `${domain}/schemas/core-context.jsonld`
                    : `${domain}/context/${namespace}-v1.jsonld`;
            case 'vocab':
                return namespace === 'core' 
                    ? `${domain}/vocab/core`
                    : `${domain}/vocab/${namespace}`;
            default:
                throw new Error(`Unsupported schema type: ${type}`);
        }
    }

    // Legacy getters for backward compatibility
    get localContextUrl(): string {
        return this.getSchemaUrl('context', this.namespace);
    }

    get localSchemaUrl(): string {
        return this.getSchemaUrl('validation', this.namespace);
    }

    get coreContextUrl(): string {
        return this.getSchemaUrl('context', 'core');
    }

    get coreSchemaUrl(): string {
        return this.getSchemaUrl('validation', 'core');
    }

    get coreVocabUrl(): string {
        return this.getSchemaUrl('vocab', 'core');
    }

    async get(type: 'validation' | 'context' | 'vocab', namespace: string): Promise<SchemaObject> {
        const dbType = type === 'validation' ? 'schema' : type;
        
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, dbType),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }

        } catch (error) {
            console.error(`Database error while loading ${type} for namespace ${namespace}:`, error);
            throw new SchemaNotFoundError(namespace === 'core' ? 'core' : 'local', type === 'validation' ? 'schema' : type, namespace);
        }

        // No fallback - throw error if not found
        throw new SchemaNotFoundError(namespace === 'core' ? 'core' : 'local', type === 'validation' ? 'schema' : type, namespace);
    }

    async has(type: 'validation' | 'context' | 'vocab', namespace: string): Promise<boolean> {
        const dbType = type === 'validation' ? 'schema' : type;
        
        try {
            const result = await db
                .select({ id: Schema.id })
                .from(Schema)
                .where(and(
                    eq(Schema.type, dbType),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            return result.length > 0;
        } catch (error) {
            console.warn(`Failed to check ${type} existence for namespace ${namespace}:`, error);
            return false;
        }
    }

    async save(type: 'validation' | 'context' | 'vocab', namespace: string, schema: SchemaObject): Promise<{ id: string; action: 'created' | 'updated' }> {
        const dbType = type === 'validation' ? 'schema' : type;
        
        // Validate schema structure
        this.validateSchemaStructure(schema, type, namespace);

        try {
            const existingSchema = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, dbType),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (existingSchema.length > 0) {
                // Update existing schema
                await db
                    .update(Schema)
                    .set({
                        content: schema,
                        uri: this.getSchemaUrl(type, namespace),
                        updatedAt: new Date()
                    })
                    .where(eq(Schema.id, existingSchema[0].id));

                return { id: existingSchema[0].id, action: 'updated' };
            } else {
                // Create new schema
                const result = await db
                    .insert(Schema)
                    .values({
                        type: dbType,
                        namespace: namespace,
                        version: 'v1',
                        uri: this.getSchemaUrl(type, namespace),
                        content: schema,
                        isActive: true
                    })
                    .returning({ id: Schema.id });

                return { id: result[0].id, action: 'created' };
            }
        } catch (error) {
            console.error(`Database error while saving ${type} for namespace ${namespace}:`, error);
            throw new Error(`Failed to save ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async delete(type: 'validation' | 'context' | 'vocab', namespace: string): Promise<{ id: string }> {
        const dbType = type === 'validation' ? 'schema' : type;
        
        try {
            const result = await db
                .update(Schema)
                .set({
                    isActive: false,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(Schema.type, dbType),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .returning({ id: Schema.id });

            if (result.length === 0) {
                throw new Error(`${type} not found for namespace ${namespace}`);
            }

            return { id: result[0].id };
        } catch (error) {
            console.error(`Database error while deleting ${type} for namespace ${namespace}:`, error);
            throw new Error(`Failed to delete ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getMetadata(type: 'validation' | 'context' | 'vocab', namespace: string): Promise<{
        id: string;
        uri: string;
        createdAt: Date;
        updatedAt: Date;
    } | null> {
        const dbType = type === 'validation' ? 'schema' : type;
        
        try {
            const result = await db
                .select({
                    id: Schema.id,
                    uri: Schema.uri,
                    createdAt: Schema.createdAt,
                    updatedAt: Schema.updatedAt
                })
                .from(Schema)
                .where(and(
                    eq(Schema.type, dbType),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error(`Database error while getting ${type} metadata for namespace ${namespace}:`, error);
            return null;
        }
    }

    // Convenience methods for backward compatibility
    async getCoreContext(): Promise<SchemaObject> {
        return this.get('context', 'core');
    }

    async getCoreSchema(): Promise<SchemaObject> {
        return this.get('validation', 'core');
    }

    async getLocalContext(): Promise<SchemaObject> {
        return this.get('context', this.namespace);
    }

    async getLocalSchema(): Promise<SchemaObject> {
        return this.get('validation', this.namespace);
    }

    async hasLocalSchema(): Promise<boolean> {
        return this.has('validation', this.namespace);
    }

    async hasCoreSchema(): Promise<boolean> {
        return this.has('validation', 'core');
    }

    async hasLocalContext(): Promise<boolean> {
        return this.has('context', this.namespace);
    }

    async hasCoreContext(): Promise<boolean> {
        return this.has('context', 'core');
    }

    async saveLocalSchema(schema: SchemaObject): Promise<{ id: string; action: 'created' | 'updated' }> {
        return this.save('validation', this.namespace, schema);
    }

    async saveLocalContext(context: SchemaObject): Promise<{ id: string; action: 'created' | 'updated' }> {
        return this.save('context', this.namespace, context);
    }

    async deleteLocalSchema(): Promise<{ id: string }> {
        return this.delete('validation', this.namespace);
    }

    async deleteLocalContext(): Promise<{ id: string }> {
        return this.delete('context', this.namespace);
    }

    async getSchemaMetadata(type: 'schema' | 'context', namespace?: string): Promise<{
        id: string;
        uri: string;
        createdAt: Date;
        updatedAt: Date;
    } | null> {
        const schemaType = type === 'schema' ? 'validation' : type;
        return this.getMetadata(schemaType, namespace || this.namespace);
    }

    validateSchemaStructure(schema: SchemaObject, type: 'validation' | 'context' | 'vocab', namespace: string): void {
        if (type === 'validation') {
            if (!schema.$id) {
                throw new Error('Schema must have a $id property');
            }

            // For local validation schemas, validate the allOf structure
            if (namespace !== 'core' && schema.allOf && Array.isArray(schema.allOf)) {
                if (schema.allOf.length < 2) {
                    throw new Error('allOf array must have at least 2 elements: core schema reference and local schema definition');
                }

                const coreRef = schema.allOf[0];
                if (!coreRef.$ref || !coreRef.$ref.includes('core-schema.json')) {
                    throw new Error('First element of allOf must be a $ref to the core schema');
                }

                const localSchema = schema.allOf[1];
                if (!localSchema.type || localSchema.type !== 'object') {
                    throw new Error('Second element of allOf must be an object schema with type: "object"');
                }

                if (!localSchema.properties || typeof localSchema.properties !== 'object') {
                    throw new Error('Local schema must define properties');
                }
            }
        } else if (type === 'context') {
            if (!schema['@context'] && !schema.$id) {
                throw new Error('Context must have either @context or $id property');
            }
        } else if (type === 'vocab') {
            // Vocab schemas can have various structures, basic validation for now
            if (!schema.$id && !schema['@context'] && !schema.name) {
                throw new Error('Vocab must have at least one of: $id, @context, or name property');
            }
        }
    }
}