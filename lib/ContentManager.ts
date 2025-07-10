import { Content } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DrizzleInstance } from "@/db";
import { SchemaManager } from "./SchemaManager";
import { Validator } from "./Validator";

export class ContentManager {
    constructor(
        public db: DrizzleInstance,
        public schemaManager: SchemaManager,
        public validator: Validator
    ) { }

    async save(contentType: string, namespace: string, uri: string, data: any, sourceNode: string = 'local'): Promise<{ id: string; action: 'created' | 'updated' }> {

        await this.validator.validate(data);

        try {

            const existing = await this.db
                .select()
                .from(Content)
                .where(eq(Content.uri, uri))
                .limit(1);

            if (existing.length > 0) {
                // Update existing content
                await this.db
                    .update(Content)
                    .set({
                        contentType,
                        namespace,
                        data,
                        sourceNode,
                        updatedAt: new Date()
                    })
                    .where(eq(Content.id, existing[0].id));

                return { id: existing[0].id, action: 'updated' };
            } else {
                // Create new content
                const result = await this.db
                    .insert(Content)
                    .values({
                        uri,
                        contentType,
                        namespace,
                        data,
                        sourceNode
                    })
                    .returning({ id: Content.id });

                return { id: result[0].id, action: 'created' };
            }
        } catch (error) {
            console.error(`Database error while saving content ${uri}:`, error);
            throw new Error(`Failed to save content ${uri}: ${(error as Error).message}`);
        }
    }

    async getByUri(uri: string): Promise<any | null> {
        try {
            const result = await this.db
                .select()
                .from(Content)
                .where(eq(Content.uri, uri))
                .limit(1);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error(`Database error while retrieving content ${uri}:`, error);
            throw new Error(`Failed to retrieve content ${uri}: ${(error as Error).message}`);
        }
    }

    async getByType(contentType: string, namespace?: string): Promise<any[]> {
        try {
            const conditions = [eq(Content.contentType, contentType)];
            if (namespace) {
                conditions.push(eq(Content.namespace, namespace));
            }

            const result = await this.db
                .select()
                .from(Content)
                .where(and(...conditions));

            return result;
        } catch (error) {
            console.error(`Database error while retrieving content of type ${contentType}:`, error);
            throw new Error(`Failed to retrieve content of type ${contentType}: ${(error as Error).message}`);
        }
    }

    async getByNamespace(namespace: string): Promise<any[]> {
        try {
            let result;
            if (namespace === '') {
                // Get all content across all namespaces
                result = await this.db
                    .select()
                    .from(Content);
            } else {
                result = await this.db
                    .select()
                    .from(Content)
                    .where(eq(Content.namespace, namespace));
            }

            return result;
        } catch (error) {
            console.error(`Database error while retrieving content for namespace ${namespace}:`, error);
            throw new Error(`Failed to retrieve content for namespace ${namespace}: ${(error as Error).message}`);
        }
    }

    async delete(uri: string): Promise<{ id: string }> {
        try {
            const result = await this.db
                .delete(Content)
                .where(eq(Content.uri, uri))
                .returning({ id: Content.id });

            if (result.length === 0) {
                throw new Error(`Content not found: ${uri}`);
            }

            return { id: result[0].id };
        } catch (error) {
            console.error(`Database error while deleting content ${uri}:`, error);
            throw new Error(`Failed to delete content ${uri}: ${(error as Error).message}`);
        }
    }

    async getAvailableContentTypes(namespace?: string): Promise<string[]> {
        try {
            const conditions = namespace ? [eq(Content.namespace, namespace)] : [];

            const result = await this.db
                .selectDistinct({ contentType: Content.contentType })
                .from(Content)
                .where(conditions.length > 0 ? and(...conditions) : undefined);

            return result.map(row => row.contentType);
        } catch (error) {
            console.error(`Database error while retrieving content types:`, error);
            throw new Error(`Failed to retrieve content types: ${(error as Error).message}`);
        }
    }

    async getContentStats(namespace?: string): Promise<{ contentType: string; count: number }[]> {
        try {
            const conditions = namespace ? [eq(Content.namespace, namespace)] : [];

            const result = await this.db
                .select({
                    contentType: Content.contentType,
                    count: sql<number>`count(*)`.as('count')
                })
                .from(Content)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .groupBy(Content.contentType);

            return result;
        } catch (error) {
            console.error(`Database error while retrieving content stats:`, error);
            throw new Error(`Failed to retrieve content stats: ${(error as Error).message}`);
        }
    }
} 