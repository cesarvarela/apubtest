import { SchemaObject } from "ajv";
import { db } from "../db";
import { Schema } from "../db/schema";
import { eq, and } from "drizzle-orm";

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
        return `${this.coreDomain}/context/core-v1.jsonld`;
    }

    get coreSchemaUrl(): string {
        return `${this.coreDomain}/schema/core-v1.json`;
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
        } catch (error) {
            console.warn('Failed to load core context from database, using fallback:', error);
        }

        // Fallback if not found in database
        return {
            "@context": {
                "@vocab": `${this.coreVocabUrl}#`,
                "@protected": true,
                "@id": "@id",
                "@type": "@type",
            },
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
        } catch (error) {
            console.warn('Failed to load core schema from database, using fallback:', error);
        }

        // Fallback if not found in database
        return {
            $id: this.coreSchemaUrl,
            type: "object",
            required: ["@id", "@type"],
            properties: {
                "@id": { type: "string", format: "uri" },
                "@type": { const: "Incident" },
            },
            additionalProperties: true,
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
            console.warn('Failed to load local context from database, using fallback:', error);
        }

        // Fallback if not found in database
        return {
            "@context": [
                this.coreContextUrl, // include the core context
                {
                    "schema": "http://schema.org/", // use definition from schema.org
                    "title": "schema:headline",
                    "reports": {
                        "@id": "schema:citation",
                        "@container": "@set",
                    }
                }
            ]
        }
    }

    async getLocalSchema(): Promise<SchemaObject> {
        try {
            const result = await db
                .select()
                .from(Schema)
                .where(and(
                    eq(Schema.type, 'schema'),
                    eq(Schema.namespace, this.namespace),
                    eq(Schema.version, 'v1'),
                    eq(Schema.isActive, true)
                ))
                .limit(1);

            if (result.length > 0) {
                return result[0].content as SchemaObject;
            }
        } catch (error) {
            console.warn('Failed to load local schema from database, using fallback:', error);
        }

        // Fallback if not found in database
        return {
            $id: this.localSchemaUrl,
            definitions: {
                reportArray: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["@type", "url", "headline"],
                        properties: {
                            "@type": { const: "Article" },
                            url: { type: "string", format: "uri" },
                            headline: { type: "string" }
                        },
                        additionalProperties: true,
                    }
                }
            },
            allOf: [
                { $ref: this.coreSchemaUrl },
                {
                    type: "object",
                    properties: {
                        title: { type: "string", minLength: 5 },
                        reports: { $ref: "#/definitions/reportArray" }
                    },
                    additionalProperties: true
                }
            ]
        }
    }

}