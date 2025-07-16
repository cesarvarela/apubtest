import { Content } from "../db/schema";
import { eq, and, sql, like, or } from "drizzle-orm";
import { DrizzleInstance } from "@/db";
import { SchemaManager, RelationshipDefinition } from "./SchemaManager";
import { Validator } from "./Validator";

export class ContentManager {
    constructor(
        public db: DrizzleInstance,
        public schemaManager: SchemaManager,
        public validator: Validator
    ) { }

    async save(contentType: string, namespace: string, uri: string, data: any, sourceNode: string = 'local'): Promise<{ id: string; action: 'created' | 'updated' }> {

        // Validate schema
        await this.validator.validate(data);
        
        // Validate relationships
        await this.validateRelationships(data);

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

    // Relationship operations
    async getRelatedContent(uri: string, relationshipName?: string): Promise<{ relationship: string; targets: any[] }[]> {
        try {
            const content = await this.getByUri(uri);
            if (!content) {
                throw new Error(`Content not found: ${uri}`);
            }

            const data = content.data;
            const relationships: { relationship: string; targets: any[] }[] = [];

            // Get relationship definitions for this content type
            const contentTypes = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
            const allRelationships: RelationshipDefinition[] = [];

            for (const type of contentTypes) {
                const namespace = this.getNamespaceFromType(type);
                const typeName = this.getTypeNameFromType(type);
                const typeRelationships = await this.schemaManager.getRelationshipsForType(namespace, typeName);
                allRelationships.push(...typeRelationships);
            }

            // Filter relationships if specific one requested
            const targetRelationships = relationshipName 
                ? allRelationships.filter(rel => rel.name === relationshipName)
                : allRelationships;

            // Extract relationship data from content
            for (const relationship of targetRelationships) {
                const relationshipValue = data[relationship.name];
                if (relationshipValue) {
                    const targets = Array.isArray(relationshipValue) ? relationshipValue : [relationshipValue];
                    relationships.push({
                        relationship: relationship.name,
                        targets: targets
                    });
                }
            }

            return relationships;
        } catch (error) {
            console.error(`Database error while retrieving related content for ${uri}:`, error);
            throw new Error(`Failed to retrieve related content for ${uri}: ${(error as Error).message}`);
        }
    }

    async addRelationship(sourceUri: string, relationshipName: string, targetUri: string, targetData?: any): Promise<void> {
        try {
            const sourceContent = await this.getByUri(sourceUri);
            if (!sourceContent) {
                throw new Error(`Source content not found: ${sourceUri}`);
            }

            const targetContent = await this.getByUri(targetUri);
            if (!targetContent) {
                throw new Error(`Target content not found: ${targetUri}`);
            }

            // Get relationship definition
            const sourceTypes = Array.isArray(sourceContent.data['@type']) ? sourceContent.data['@type'] : [sourceContent.data['@type']];
            let relationshipDef: RelationshipDefinition | null = null;

            for (const type of sourceTypes) {
                const namespace = this.getNamespaceFromType(type);
                const typeName = this.getTypeNameFromType(type);
                const relationships = await this.schemaManager.getRelationshipsForType(namespace, typeName);
                relationshipDef = relationships.find(rel => rel.name === relationshipName) || null;
                if (relationshipDef) break;
            }

            if (!relationshipDef) {
                throw new Error(`Relationship '${relationshipName}' not defined for content type`);
            }

            // Create relationship target object
            const targetObj = targetData || {
                '@id': targetUri,
                '@type': targetContent.data['@type'],
                'name': targetContent.data.name || targetContent.data.title || 'Unnamed'
            };

            // Update source content with relationship
            const updatedData = { ...sourceContent.data };
            const currentValue = updatedData[relationshipName];

            if (relationshipDef.cardinality === 'one-to-one' || relationshipDef.cardinality === 'many-to-one') {
                updatedData[relationshipName] = targetObj;
            } else {
                const currentArray = currentValue ? (Array.isArray(currentValue) ? currentValue : [currentValue]) : [];
                
                // Check if relationship already exists
                const existingIndex = currentArray.findIndex((item: any) => item['@id'] === targetUri);
                if (existingIndex === -1) {
                    currentArray.push(targetObj);
                    updatedData[relationshipName] = currentArray;
                }
            }

            // Save updated content
            await this.save(sourceContent.contentType, sourceContent.namespace, sourceUri, updatedData, sourceContent.sourceNode);

        } catch (error) {
            console.error(`Database error while adding relationship ${relationshipName} from ${sourceUri} to ${targetUri}:`, error);
            throw new Error(`Failed to add relationship ${relationshipName}: ${(error as Error).message}`);
        }
    }

    async removeRelationship(sourceUri: string, relationshipName: string, targetUri: string): Promise<void> {
        try {
            const sourceContent = await this.getByUri(sourceUri);
            if (!sourceContent) {
                throw new Error(`Source content not found: ${sourceUri}`);
            }

            const updatedData = { ...sourceContent.data };
            const currentValue = updatedData[relationshipName];

            if (!currentValue) {
                return; // Relationship doesn't exist, nothing to remove
            }

            if (Array.isArray(currentValue)) {
                const filteredArray = currentValue.filter((item: any) => item['@id'] !== targetUri);
                if (filteredArray.length === 0) {
                    delete updatedData[relationshipName];
                } else {
                    updatedData[relationshipName] = filteredArray;
                }
            } else {
                if (currentValue['@id'] === targetUri) {
                    delete updatedData[relationshipName];
                }
            }

            // Save updated content
            await this.save(sourceContent.contentType, sourceContent.namespace, sourceUri, updatedData, sourceContent.sourceNode);

        } catch (error) {
            console.error(`Database error while removing relationship ${relationshipName} from ${sourceUri} to ${targetUri}:`, error);
            throw new Error(`Failed to remove relationship ${relationshipName}: ${(error as Error).message}`);
        }
    }

    async findContentByRelationship(relationshipName: string, targetUri: string, namespace?: string): Promise<any[]> {
        try {
            const conditions = [];
            if (namespace) {
                conditions.push(eq(Content.namespace, namespace));
            }

            // Search for content that has the relationship pointing to the target
            conditions.push(
                or(
                    // Single relationship value
                    like(Content.data, `%"${relationshipName}":{%"@id":"${targetUri}"%}%`),
                    // Array relationship value
                    like(Content.data, `%"${relationshipName}":[%"@id":"${targetUri}"%`)
                )
            );

            const result = await this.db
                .select()
                .from(Content)
                .where(and(...conditions));

            return result;
        } catch (error) {
            console.error(`Database error while finding content by relationship ${relationshipName} to ${targetUri}:`, error);
            throw new Error(`Failed to find content by relationship ${relationshipName}: ${(error as Error).message}`);
        }
    }

    private getNamespaceFromType(type: string): string {
        const colonIndex = type.indexOf(':');
        if (colonIndex > 0) {
            return type.substring(0, colonIndex);
        }
        return this.schemaManager.namespace;
    }

    private getTypeNameFromType(type: string): string {
        const colonIndex = type.indexOf(':');
        if (colonIndex > 0) {
            return type.substring(colonIndex + 1);
        }
        return type;
    }

    private async validateRelationships(payload: any): Promise<void> {
        const types = this.extractTypesFromPayload(payload);
        const errors: string[] = [];
        
        for (const type of types) {
            const namespace = this.getNamespaceFromType(type);
            const typeName = this.getTypeNameFromType(type);
            
            // Get relationship definitions for this type
            const relationships = await this.schemaManager.getRelationshipsForType(namespace, typeName);
            
            for (const relationship of relationships) {
                const relationshipErrors = await this.validateRelationship(payload, relationship);
                errors.push(...relationshipErrors);
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Relationship validation failed: ${errors.join('; ')}`);
        }
    }

    private async validateRelationship(payload: any, relationship: RelationshipDefinition): Promise<string[]> {
        const errors: string[] = [];
        const relationshipValue = payload[relationship.name];
        
        // Check if required relationship is present
        if (relationship.isRequired && !relationshipValue) {
            errors.push(`Required relationship '${relationship.name}' is missing`);
            return errors;
        }
        
        // If relationship is not present and not required, it's valid
        if (!relationshipValue) {
            return errors;
        }
        
        // Validate cardinality
        const cardinalityErrors = this.validateCardinality(relationshipValue, relationship);
        errors.push(...cardinalityErrors);
        
        // Validate target type and existence
        const targetErrors = await this.validateRelationshipTargets(relationshipValue, relationship);
        errors.push(...targetErrors);
        
        return errors;
    }

    private validateCardinality(relationshipValue: any, relationship: RelationshipDefinition): string[] {
        const errors: string[] = [];
        const isArray = Array.isArray(relationshipValue);
        
        switch (relationship.cardinality) {
            case 'one-to-one':
            case 'many-to-one':
                if (isArray) {
                    errors.push(`Relationship '${relationship.name}' expects single value but got array`);
                }
                break;
            case 'one-to-many':
            case 'many-to-many':
                if (!isArray) {
                    errors.push(`Relationship '${relationship.name}' expects array but got single value`);
                } else if (relationshipValue.length === 0) {
                    errors.push(`Relationship '${relationship.name}' array cannot be empty`);
                }
                break;
        }
        
        return errors;
    }

    private async validateRelationshipTargets(relationshipValue: any, relationship: RelationshipDefinition): Promise<string[]> {
        const errors: string[] = [];
        const targets = Array.isArray(relationshipValue) ? relationshipValue : [relationshipValue];
        
        for (const target of targets) {
            // Validate target has required properties
            if (!target['@id']) {
                errors.push(`Relationship target must have '@id' property`);
                continue;
            }
            
            if (!target['@type']) {
                errors.push(`Relationship target must have '@type' property`);
                continue;
            }
            
            // Validate target type matches expected type
            const targetTypes = Array.isArray(target['@type']) ? target['@type'] : [target['@type']];
            const expectedType = `${this.getNamespaceFromType(relationship.targetType)}:${this.getTypeNameFromType(relationship.targetType)}`;
            
            if (!targetTypes.includes(expectedType) && !targetTypes.includes(relationship.targetType)) {
                errors.push(`Relationship target type ${targetTypes.join(', ')} does not match expected type ${relationship.targetType}`);
            }
            
            // Validate target exists
            try {
                const targetContent = await this.getByUri(target['@id']);
                if (!targetContent) {
                    errors.push(`Relationship target '${target['@id']}' does not exist`);
                }
            } catch (error) {
                errors.push(`Error validating relationship target '${target['@id']}': ${(error as Error).message}`);
            }
        }
        
        return errors;
    }

    private extractTypesFromPayload(payload: any): string[] {
        const type = payload['@type'];
        if (!type) {
            return [];
        }
        return Array.isArray(type) ? type : [type];
    }
}