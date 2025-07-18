import { faker } from '@faker-js/faker';
import { AbstractSchemaManager } from './AbstractSchemaManager';
import { SchemaObject } from 'ajv';

export interface DataSources {
  [type: string]: {
    entities?: { id: string; name: string; [key: string]: any }[];
    values?: { [property: string]: string[] };
  };
}

export interface JsonSchema {
  type: string;
  properties?: { [key: string]: any };
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  const?: any;
  format?: string;
}

export class FakeDataGenerator {
  constructor(
    private schemaManager: AbstractSchemaManager,
    private dataSources: DataSources = {}
  ) {
    if (!schemaManager) {
      throw new Error('SchemaManager instance is required');
    }
  }

  async generateFakeDataForType(
    namespace: string, 
    targetType: string
  ): Promise<any> {
    // Get both validation and context schemas for this type
    const validationSchema = await this.schemaManager.getSchema('validation', namespace, targetType);
    const contextSchema = await this.schemaManager.getSchema('context', namespace, targetType);
    
    if (!validationSchema) {
      throw new Error(`No validation schema found for ${namespace}:${targetType}`);
    }
    
    // Generate fake data using both schemas
    return this.generateFromSchemas(validationSchema, contextSchema, `${namespace}:${targetType}`);
  }

  private async generateFromSchemas(
    validationSchema: SchemaObject, 
    contextSchema: any,
    entityType: string
  ): Promise<any> {
    const result: any = {};
    const properties = validationSchema.properties || {};
    const required = validationSchema.required || [];

    // Always add standard context URLs
    result['@context'] = this.generateContextUrls();
    
    // Set the type
    result['@type'] = entityType;
    
    // Generate @id first
    result['@id'] = this.generateEntityId(entityType);
    
    // Generate properties based on validation schema + context awareness
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (propName.startsWith('@')) continue; // Skip @context, @type, @id - handled above
      
      const shouldGenerate = required.includes(propName) || faker.datatype.boolean({ probability: 0.7 });
      if (!shouldGenerate) continue;
      
      result[propName] = await this.generatePropertyValue(propName, propSchema, entityType);
    }
    
    return result;
  }

  private generateContextUrls(): string[] {
    const coreUrl = `${this.schemaManager.getDomain('core')}/api/schemas/v1/core/context.jsonld`;
    const localUrl = `${this.schemaManager.getDomain(this.schemaManager.namespace)}/api/schemas/v1/${this.schemaManager.namespace}/context.jsonld`;
    return [coreUrl, localUrl];
  }

  private generateEntityId(entityType: string): string {
    // Check if we have a real entity for this type
    if (this.dataSources[entityType]?.entities) {
      const entity = faker.helpers.arrayElement(this.dataSources[entityType].entities);
      return entity.id;
    }
    
    // Generate a semantic ID based on entity type
    const namespace = this.extractNamespace(entityType);
    const typeWithoutNamespace = this.extractTargetType(entityType);
    const id = faker.lorem.slug();
    
    return `https://example.org/${namespace.toLowerCase()}/${typeWithoutNamespace.toLowerCase()}/${id}`;
  }

  private async generatePropertyValue(
    propName: string, 
    propSchema: any, 
    entityType: string
  ): Promise<any> {
    // Check if we have real data for this entity type and property
    if (this.dataSources[entityType]?.entities) {
      const entity = faker.helpers.arrayElement(this.dataSources[entityType].entities);
      if (propName === 'name' || propName === 'title') {
        return entity.name;
      }
    }
    
    if (this.dataSources[entityType]?.values?.[propName]) {
      return faker.helpers.arrayElement(this.dataSources[entityType].values[propName]);
    }
    
    // Handle nested objects (like Organization references)
    if (propSchema.type === 'object' && propSchema.properties?.['@type']) {
      const nestedType = this.extractTypeFromSchema(propSchema);
      if (nestedType) {
        const namespace = this.extractNamespace(nestedType);
        const targetType = this.extractTargetType(nestedType);
        return this.generateFakeDataForType(namespace, targetType);
      }
    }
    
    // Handle arrays of entities
    if (propSchema.type === 'array' && propSchema.items?.properties?.['@type']) {
      const nestedType = this.extractTypeFromSchema(propSchema.items);
      if (nestedType) {
        const namespace = this.extractNamespace(nestedType);
        const targetType = this.extractTargetType(nestedType);
        const count = faker.number.int({ min: 1, max: 3 });
        const items = [];
        for (let i = 0; i < count; i++) {
          items.push(await this.generateFakeDataForType(namespace, targetType));
        }
        return items;
      }
    }
    
    // Fallback to basic generation
    return this.generateFromSchema(propSchema);
  }

  private extractNamespace(entityType: string): string {
    if (entityType.includes(':')) {
      return entityType.split(':')[0];
    }
    return 'core';
  }

  private extractTargetType(entityType: string): string {
    if (entityType.includes(':')) {
      return entityType.split(':')[1];
    }
    return entityType;
  }

  private extractTypeFromSchema(schema: any): string | null {
    if (schema.properties?.['@type']?.const) {
      return schema.properties['@type'].const;
    }
    
    if (schema.properties?.['@type']?.oneOf) {
      const constTypes = schema.properties['@type'].oneOf
        .filter((option: any) => option.const)
        .map((option: any) => option.const);
      if (constTypes.length > 0) {
        return faker.helpers.arrayElement(constTypes);
      }
    }
    
    return null;
  }

  private generateFromSchema(schema: any): any {
    if (schema.type === 'object') {
      // For basic object generation (non-entity)
      const result: any = {};
      const properties = schema.properties || {};
      
      for (const [propName, propSchema] of Object.entries(properties)) {
        result[propName] = this.generateFromSchema(propSchema);
      }
      
      return result;
    }
    
    if (schema.type === 'array') {
      return this.generateArray(schema);
    }
    
    if (schema.type === 'string') {
      return this.generateString(schema);
    }
    
    if (schema.type === 'number' || schema.type === 'integer') {
      return this.generateNumber(schema);
    }
    
    if (schema.type === 'boolean') {
      return faker.datatype.boolean();
    }
    
    if (schema.oneOf) {
      const randomChoice = faker.helpers.arrayElement(schema.oneOf);
      return this.generateFromSchema(randomChoice);
    }
    
    if (schema.const !== undefined) {
      return schema.const;
    }
    
    return null;
  }

  // Convenience methods for common entity types
  async generateIncident(): Promise<any> {
    return this.generateFakeDataForType('core', 'Incident');
  }

  async generateOrganization(): Promise<any> {
    return this.generateFakeDataForType('core', 'Organization');
  }

  async generatePerson(): Promise<any> {
    return this.generateFakeDataForType('core', 'Person');
  }

  async generateReport(): Promise<any> {
    return this.generateFakeDataForType(this.schemaManager.namespace, 'Report');
  }

  private generateArray(schema: JsonSchema): any[] {
    const length = faker.number.int({ min: 1, max: 3 });
    const result = [];
    
    for (let i = 0; i < length; i++) {
      if (schema.items) {
        result.push(this.generateFromSchema(schema.items));
      }
    }
    
    return result;
  }

  private generateString(schema: JsonSchema): string {
    if (schema.format === 'uri') {
      return this.generateUri();
    }
    
    if (schema.format === 'email') {
      return faker.internet.email();
    }
    
    return faker.lorem.words({ min: 1, max: 4 });
  }

  private generateNumber(schema: JsonSchema): number {
    return faker.number.int({ min: 1, max: 1000 });
  }

  private generateUri(): string {
    const domains = [
      'https://example.org',
      'https://en.wikipedia.org/wiki',
      'https://www.wikidata.org/entity'
    ];
    
    const domain = faker.helpers.arrayElement(domains);
    const path = faker.lorem.slug();
    
    return `${domain}/${path}`;
  }

}

// Convenience function
export async function generateFakeDataForType(
  schemaManager: AbstractSchemaManager,
  namespace: string,
  targetType: string,
  dataSources?: DataSources
): Promise<any> {
  const generator = new FakeDataGenerator(schemaManager, dataSources);
  return generator.generateFakeDataForType(namespace, targetType);
}