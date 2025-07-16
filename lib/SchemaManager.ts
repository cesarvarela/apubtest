import { SchemaObject } from "ajv";
import { Schema, Relationship } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { DrizzleInstance } from "@/db";
import { ContextMerger } from "./ContextMerger";

export interface RelationshipDefinition {
    name: string;
    sourceType: string;
    targetType: string;
    cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    isRequired: boolean;
    inverseRelationship?: string;
    metadata?: Record<string, any>;
}

export class SchemaManager {

    constructor(
        public db: DrizzleInstance,
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

    getDomain(namespace = this.namespace): string {

        if (namespace === 'core') {

            return this.coreDomain;
        }
        else if (namespace === 'local' || namespace === this.namespace) {

            return this.localDomain;
        }
        else {

            throw new Error(`Unknown namespace: ${namespace}`);
        }
    }

    getSchemaUrl(type: 'validation' | 'context' | 'relationship', namespace: string): string {

        const domain = this.getDomain(namespace);

        switch (type) {

            case 'validation':

                return `${domain}/schemas/${namespace}-schema.json`;

            case 'context':

                return `${domain}/schemas/${namespace}-v1.jsonld`;

            case 'relationship':

                return `${domain}/schemas/${namespace}-relationships.json`;

            default:

                throw new Error(`Unsupported schema type: ${type}`);
        }
    }

    async getSchema(type: 'validation' | 'context' | 'relationship', namespace: string, targetType: string | null = null): Promise<SchemaObject | null> {

        try {
            const result = await this.db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, type),
                    eq(Schema.namespace, namespace),
                    targetType ? eq(Schema.targetType, targetType) : isNull(Schema.targetType),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }

        } catch (error) {

            console.error(`Database error while loading ${type} for namespace ${namespace}:`, error);

            throw new Error(`Failed to load ${type} ${namespace}: ${(error as Error).message}}`);
        }

        return null;
    }

    async getSchemasByNamespaceAndType(namespace: string, type: 'validation' | 'context' | 'relationship'): Promise<Array<{ content: any; targetType: string | null }>> {
        try {
            const results = await this.db
                .select({
                    content: Schema.content,
                    targetType: Schema.targetType
                })
                .from(Schema)
                .where(and(
                    eq(Schema.type, type),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ));

            return results;

        } catch (error) {
            console.error(`Database error while loading ${type} schemas for namespace ${namespace}:`, error);
            throw new Error(`Failed to load ${type} schemas for ${namespace}: ${(error as Error).message}`);
        }
    }

    async getMergedContextForNamespace(namespace: string): Promise<SchemaObject | null> {
        try {
            const contextSchemas = await this.getSchemasByNamespaceAndType(namespace, 'context');
            
            if (contextSchemas.length === 0) {
                return null;
            }

            const contexts = contextSchemas.map(schema => schema.content);
            const merged = ContextMerger.mergeContexts(contexts, namespace);
            
            return merged as SchemaObject;

        } catch (error) {
            console.error(`Error merging contexts for namespace ${namespace}:`, error);
            throw new Error(`Failed to merge contexts for ${namespace}: ${(error as Error).message}`);
        }
    }

    async save(type: 'validation' | 'context' | 'relationship', namespace: string, targetType: string | null, schema: SchemaObject): Promise<{ id: string; action: 'created' | 'updated' }> {

        this.validateSchemaStructure(schema, type, namespace, targetType);

        try {
            const existingSchema = await this.db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, type),
                    eq(Schema.namespace, namespace),
                    targetType ? eq(Schema.targetType, targetType) : isNull(Schema.targetType),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (existingSchema.length > 0) {

                await this.db
                    .update(Schema)
                    .set({
                        content: schema,
                        updatedAt: new Date()
                    })
                    .where(eq(Schema.id, existingSchema[0].id));

                return { id: existingSchema[0].id, action: 'updated' };
            }
            else {

                const result = await this.db
                    .insert(Schema)
                    .values({
                        type: type,
                        namespace: namespace,
                        version: 'v1',
                        targetType: targetType,
                        content: schema,
                        isActive: true
                    })
                    .returning({ id: Schema.id });

                return { id: result[0].id, action: 'created' };
            }
        } catch (error) {

            console.error(`Database error while saving ${type} for namespace ${namespace}:`, error);

            throw new Error(`Failed to save ${type} ${namespace}: ${(error as Error).message}`);
        }
    }

    async delete(type: 'validation' | 'context' | 'relationship', namespace: string, targetType: string | null): Promise<{ id: string }> {

        try {
            const result = await this.db
                .update(Schema)
                .set({
                    isActive: false,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(Schema.type, type),
                    eq(Schema.namespace, namespace),
                    targetType ? eq(Schema.targetType, targetType) : isNull(Schema.targetType),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .returning({ id: Schema.id });

            if (result.length === 0) {
                throw new Error(`${type} not found for namespace ${namespace}`);
            }

            return { id: result[0].id };
        }
        catch (error) {

            console.error(`Database error while deleting ${type} for namespace ${namespace}:`, error);

            throw new Error(`Failed to delete ${type} ${namespace}: ${(error as Error).message}`);
        }
    }

    async getTargetTypes(namespace: string): Promise<string[]> {
        try {
            const result = await this.db
                .select({ targetType: Schema.targetType })
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'validation'),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .groupBy(Schema.targetType);

            return result
                .map(row => row.targetType)
                .filter((targetType): targetType is string => targetType !== null);
        } catch (error) {
            console.error(`Database error while loading target types for validation schemas in namespace ${namespace}:`, error);
            throw new Error(`Failed to load target types for validation schemas in namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async getContextTargetTypes(namespace: string): Promise<string[]> {
        try {
            const result = await this.db
                .select({ targetType: Schema.targetType })
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'context'),
                    eq(Schema.namespace, namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .groupBy(Schema.targetType);

            return result
                .map(row => row.targetType)
                .filter((targetType): targetType is string => targetType !== null);
        } catch (error) {
            console.error(`Database error while loading target types for context schemas in namespace ${namespace}:`, error);
            throw new Error(`Failed to load target types for context schemas in namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async getTargetTypesWithContexts(namespace: string): Promise<Array<{ targetType: string; hasContext: boolean }>> {
        try {
            // Get all target types with validation schemas
            const targetTypes = await this.getTargetTypes(namespace);
            
            // Check which ones have contexts
            const results = await Promise.all(
                targetTypes.map(async (targetType) => {
                    const context = await this.getSchema('context', namespace, targetType);
                    return {
                        targetType,
                        hasContext: context !== null
                    };
                })
            );
            
            return results;
        } catch (error) {
            console.error(`Database error while loading target types with contexts for namespace ${namespace}:`, error);
            throw new Error(`Failed to load target types with contexts for namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    validateSchemaStructure(schema: any, type: 'validation' | 'context' | 'relationship', namespace: string, targetType?: string | null): void {

        switch (type) {
            case 'validation':
                if (!schema.$id) {
                    throw new Error('Schema must have a $id property');
                }

                if (!schema.type || schema.type !== 'object') {
                    throw new Error('Validation schema must have type: "object"');
                }

                if (!schema.properties || typeof schema.properties !== 'object') {
                    throw new Error('Validation schema must define properties');
                }
                break;

            case 'context':
                // Context must have @context property
                if (!schema['@context']) {
                    throw new Error('Context must have a @context property');
                }

                const context = schema['@context'] as any;

                if (namespace === 'core') {
                    // Core context validation: flat structure with namespace definitions
                    this.validateCoreContext(context);
                } else if (targetType) {
                    // Content-type-specific context validation
                    this.validateContentTypeContext(context, namespace, targetType);
                } else {
                    // Extended context validation: supports type-scoped contexts
                    this.validateExtendedContext(context, namespace);
                }
                break;

            case 'relationship':
                // Relationship schema validation
                if (!schema.relationships || !Array.isArray(schema.relationships)) {
                    throw new Error('Relationship schema must have a relationships array');
                }

                for (const rel of schema.relationships) {
                    this.validateRelationshipDefinition(rel);
                }
                break;

            default:
                throw new Error(`Unsupported schema type: ${type}`);
        }
    }

    private validateCoreContext(context: any): void {
        if (typeof context !== 'object' || context === null) {
            throw new Error('Core context @context must be an object');
        }

        // Core context should define base namespaces
        const requiredNamespaces = ['schema'];
        for (const ns of requiredNamespaces) {
            if (!context[ns] || typeof context[ns] !== 'string') {
                throw new Error(`Core context must define '${ns}' namespace as a string`);
            }
        }

        // Core context should define the core namespace itself
        if (!context['core'] || typeof context['core'] !== 'string') {
            throw new Error('Core context must define "core" namespace');
        }

        // Validate basic term definitions
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'object' && value !== null) {
                this.validateTermDefinition(key, value as any);
            }
        }
    }

    private validateExtendedContext(context: any, namespace: string): void {
        if (typeof context !== 'object' || context === null) {
            throw new Error('Extended context @context must be an object');
        }

        // Extended contexts should reference core namespace
        if (!context['core']) {
            throw new Error('Extended context must reference "core" namespace');
        }

        // Extended contexts should define their own namespace
        if (!context[namespace]) {
            throw new Error(`Extended context must define "${namespace}" namespace`);
        }

        // Check for type-scoped contexts (like "aiid:Incident")
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'object' && value !== null && (value as any)['@context']) {
                // This is a type-scoped context
                this.validateTypeScopedContext(key, value as any);
            } else if (typeof value === 'object' && value !== null) {
                // Regular term definition
                this.validateTermDefinition(key, value as any);
            }
        }
    }

    private validateTypeScopedContext(typeName: string, typeContext: any): void {
        if (!typeContext['@id']) {
            throw new Error(`Type-scoped context "${typeName}" must have @id property`);
        }

        if (!typeContext['@context'] || typeof typeContext['@context'] !== 'object') {
            throw new Error(`Type-scoped context "${typeName}" must have @context object`);
        }

        // Validate nested context terms
        const nestedContext = typeContext['@context'];
        for (const [key, value] of Object.entries(nestedContext)) {
            if (typeof value === 'object' && value !== null) {
                this.validateTermDefinition(key, value as any);
            }
        }
    }

    private validateTermDefinition(termName: string, definition: any): void {
        // Basic term definition validation
        if (definition['@id'] && typeof definition['@id'] !== 'string') {
            throw new Error(`Term "${termName}" @id must be a string`);
        }

        if (definition['@type'] && typeof definition['@type'] !== 'string') {
            throw new Error(`Term "${termName}" @type must be a string`);
        }

        if (definition['@container'] && typeof definition['@container'] !== 'string') {
            throw new Error(`Term "${termName}" @container must be a string`);
        }

        // Validate common @container values
        if (definition['@container'] && !['@set', '@list', '@index', '@language'].includes(definition['@container'])) {
            console.warn(`Term "${termName}" uses uncommon @container value: ${definition['@container']}`);
        }
    }

    private validateContentTypeContext(context: any, namespace: string, targetType: string): void {
        if (typeof context !== 'object' || context === null) {
            throw new Error('Content type context @context must be an object');
        }

        // Content-type-specific contexts should extend the namespace context
        // They don't need to reference core or define namespace prefixes
        // They should define terms specific to this content type

        // Validate all term definitions
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'object' && value !== null) {
                this.validateTermDefinition(key, value as any);
            }
        }
    }

    // Relationship-specific methods
    async getRelationships(namespace: string): Promise<RelationshipDefinition[]> {
        try {
            const result = await this.db
                .select()
                .from(Relationship)
                .where(and(
                    eq(Relationship.namespace, namespace),
                    eq(Relationship.isActive, true)
                ));

            return result.map(row => ({
                name: row.name,
                sourceType: row.sourceType,
                targetType: row.targetType,
                cardinality: row.cardinality as 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many',
                isRequired: row.isRequired,
                inverseRelationship: row.inverseRelationship || undefined,
                metadata: row.metadata ? row.metadata as Record<string, any> : undefined
            }));
        } catch (error) {
            console.error(`Database error while loading relationships for namespace ${namespace}:`, error);
            throw new Error(`Failed to load relationships for namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async getRelationshipsForType(namespace: string, sourceType: string): Promise<RelationshipDefinition[]> {
        try {
            const result = await this.db
                .select()
                .from(Relationship)
                .where(and(
                    eq(Relationship.namespace, namespace),
                    eq(Relationship.sourceType, sourceType),
                    eq(Relationship.isActive, true)
                ));

            return result.map(row => ({
                name: row.name,
                sourceType: row.sourceType,
                targetType: row.targetType,
                cardinality: row.cardinality as 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many',
                isRequired: row.isRequired,
                inverseRelationship: row.inverseRelationship || undefined,
                metadata: row.metadata ? row.metadata as Record<string, any> : undefined
            }));
        } catch (error) {
            console.error(`Database error while loading relationships for type ${sourceType} in namespace ${namespace}:`, error);
            throw new Error(`Failed to load relationships for type ${sourceType} in namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async saveRelationship(namespace: string, relationship: RelationshipDefinition): Promise<{ id: string; action: 'created' | 'updated' }> {
        this.validateRelationshipDefinition(relationship);

        try {
            const existingRelationship = await this.db
                .select()
                .from(Relationship)
                .where(and(
                    eq(Relationship.namespace, namespace),
                    eq(Relationship.name, relationship.name),
                    eq(Relationship.sourceType, relationship.sourceType),
                    eq(Relationship.isActive, true)
                ))
                .limit(1);

            if (existingRelationship.length > 0) {
                await this.db
                    .update(Relationship)
                    .set({
                        targetType: relationship.targetType,
                        cardinality: relationship.cardinality,
                        isRequired: relationship.isRequired,
                        inverseRelationship: relationship.inverseRelationship || null,
                        metadata: relationship.metadata || null,
                        updatedAt: new Date()
                    })
                    .where(eq(Relationship.id, existingRelationship[0].id));

                return { id: existingRelationship[0].id, action: 'updated' };
            } else {
                const result = await this.db
                    .insert(Relationship)
                    .values({
                        namespace: namespace,
                        name: relationship.name,
                        sourceType: relationship.sourceType,
                        targetType: relationship.targetType,
                        cardinality: relationship.cardinality,
                        isRequired: relationship.isRequired,
                        inverseRelationship: relationship.inverseRelationship || null,
                        metadata: relationship.metadata || null,
                        isActive: true
                    })
                    .returning({ id: Relationship.id });

                return { id: result[0].id, action: 'created' };
            }
        } catch (error) {
            console.error(`Database error while saving relationship ${relationship.name} in namespace ${namespace}:`, error);
            throw new Error(`Failed to save relationship ${relationship.name} in namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async deleteRelationship(namespace: string, name: string, sourceType: string): Promise<{ id: string }> {
        try {
            const result = await this.db
                .update(Relationship)
                .set({
                    isActive: false,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(Relationship.namespace, namespace),
                    eq(Relationship.name, name),
                    eq(Relationship.sourceType, sourceType),
                    eq(Relationship.isActive, true)
                ))
                .returning({ id: Relationship.id });

            if (result.length === 0) {
                throw new Error(`Relationship ${name} not found for type ${sourceType} in namespace ${namespace}`);
            }

            return { id: result[0].id };
        } catch (error) {
            console.error(`Database error while deleting relationship ${name} in namespace ${namespace}:`, error);
            throw new Error(`Failed to delete relationship ${name} in namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    private validateRelationshipDefinition(relationship: RelationshipDefinition): void {
        if (!relationship.name || typeof relationship.name !== 'string') {
            throw new Error('Relationship name must be a non-empty string');
        }

        if (!relationship.sourceType || typeof relationship.sourceType !== 'string') {
            throw new Error('Relationship sourceType must be a non-empty string');
        }

        if (!relationship.targetType || typeof relationship.targetType !== 'string') {
            throw new Error('Relationship targetType must be a non-empty string');
        }

        const validCardinalities = ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'];
        if (!validCardinalities.includes(relationship.cardinality)) {
            throw new Error(`Relationship cardinality must be one of: ${validCardinalities.join(', ')}`);
        }

        if (typeof relationship.isRequired !== 'boolean') {
            throw new Error('Relationship isRequired must be a boolean');
        }

        if (relationship.inverseRelationship && typeof relationship.inverseRelationship !== 'string') {
            throw new Error('Relationship inverseRelationship must be a string if provided');
        }
    }
}