import { SchemaObject } from "ajv";
import { db } from "../db";
import { Schema } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export class SchemaNotFoundError extends Error {
    constructor(
        public schemaType: 'core' | 'local',
        public contentType: 'schema' | 'context',
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

    get localContextUrl(): string {
        return `${this.localDomain}/context/${this.namespace}-v1.jsonld`;
    }

    get localSchemaUrl(): string {
        return `${this.localDomain}/schema/${this.namespace}-v1.json`;
    }

    get coreContextUrl(): string {
        return `${this.coreDomain}/schemas/core-context.jsonld`;
    }

    get coreSchemaUrl(): string {
        return `${this.coreDomain}/schemas/core-schema.json`;
    }

    get coreVocabUrl(): string {
        return `${this.coreDomain}/vocab/core`;
    }

    async getCoreContext(): Promise<SchemaObject> {
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'context'),
                    eq(Schema.namespace, 'core'),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }

            // If not found in database, load from file and insert
            console.log('Core context not found in database, loading from file...');
            const filePath = join(process.cwd(), 'schemas', 'core-context.jsonld');
            const fileContent = readFileSync(filePath, 'utf-8');
            const contextObject = JSON.parse(fileContent) as SchemaObject;

            // Insert into database
            await db.insert(Schema).values({
                type: 'context',
                namespace: 'core',
                version: 'v1',
                uri: this.coreContextUrl,
                content: contextObject,
                isActive: true
            });

            console.log('Core context loaded and cached in database');
            return contextObject;

        } catch (error) {
            console.error('Database error while loading core context:', error);
            throw new SchemaNotFoundError('core', 'context');
        }
    }

    async getCoreSchema(): Promise<SchemaObject> {
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'schema'),
                    eq(Schema.namespace, 'core'),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }

            // If not found in database, load from file and insert
            console.log('Core schema not found in database, loading from file...');
            const filePath = join(process.cwd(), 'schemas', 'core-schema.json');
            const fileContent = readFileSync(filePath, 'utf-8');
            const schemaObject = JSON.parse(fileContent) as SchemaObject;

            // Insert into database
            await db.insert(Schema).values({
                type: 'schema',
                namespace: 'core',
                version: 'v1',
                uri: this.coreSchemaUrl,
                content: schemaObject,
                isActive: true
            });

            console.log('Core schema loaded and cached in database');
            return schemaObject;

        } catch (error) {
            console.error('Database error while loading core schema:', error);
            throw new SchemaNotFoundError('core', 'schema');
        }
    }

    async getLocalContext(): Promise<SchemaObject> {
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'context'),
                    eq(Schema.namespace, this.namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }
        } catch (error) {
            console.error('Database error while loading local context:', error);
            throw new SchemaNotFoundError('local', 'context', this.namespace);
        }

        // No fallback - throw error if not found
        throw new SchemaNotFoundError('local', 'context', this.namespace);
    }

    async getLocalSchema(): Promise<SchemaObject> {
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'schema'),
                    eq(Schema.namespace, this.namespace),
                    eq(Schema.version, 'v1'), // TODO: handle versioning properly
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }
        } catch (error) {
            console.error('Database error while loading local schema:', error);
            throw new SchemaNotFoundError('local', 'schema', this.namespace);
        }

        // No fallback - throw error if not found
        throw new SchemaNotFoundError('local', 'schema', this.namespace);
    }

    async hasLocalSchema(): Promise<boolean> {
        try {
            const result = await db
                .select({ id: Schema.id })
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'schema'),
                    eq(Schema.namespace, this.namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            return result.length > 0;
        } catch (error) {
            console.warn('Failed to check local schema existence:', error);
            return false;
        }
    }

    async hasCoreSchema(): Promise<boolean> {
        try {
            const result = await db
                .select({ id: Schema.id })
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'schema'),
                    eq(Schema.namespace, 'core'),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            return result.length > 0;
        } catch (error) {
            console.warn('Failed to check core schema existence:', error);
            return false;
        }
    }
}