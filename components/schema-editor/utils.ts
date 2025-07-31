import { FieldDefinition, ValidationSchema, ContextSchema } from './types';

export function extractFieldsFromSchema(schema: ValidationSchema): FieldDefinition[] {
  if (!schema.properties) return [];
  
  return Object.entries(schema.properties)
    .filter(([key]) => !key.startsWith('@')) // Skip JSON-LD metadata fields
    .map(([key, property], index) => {
      const field: FieldDefinition = {
        id: `field-${index}-${key}`,
        name: key,
        type: property.type as FieldDefinition['type'],
        required: schema.required?.includes(key) || false,
        description: property.description,
      };

      // Map JSON Schema properties to FieldDefinition
      if (property.type === 'string') {
        field.format = property.format;
        field.minLength = property.minLength;
        field.maxLength = property.maxLength;
        field.pattern = property.pattern;
        field.enum = property.enum;
      } else if (property.type === 'number' || property.type === 'integer') {
        field.type = 'number';
        field.minimum = property.minimum;
        field.maximum = property.maximum;
        field.exclusiveMinimum = property.exclusiveMinimum;
        field.exclusiveMaximum = property.exclusiveMaximum;
        field.multipleOf = property.multipleOf;
      } else if (property.type === 'array') {
        field.minItems = property.minItems;
        field.maxItems = property.maxItems;
        field.uniqueItems = property.uniqueItems;
        // TODO: Handle array items
      } else if (property.type === 'object') {
        field.additionalProperties = property.additionalProperties;
        field.minProperties = property.minProperties;
        field.maxProperties = property.maxProperties;
        // TODO: Handle nested properties
      }

      return field;
    });
}

export function generateValidationSchema(
  fields: FieldDefinition[],
  namespace: string,
  targetType: string
): ValidationSchema {
  const typePrefix = `${namespace}:${targetType}`;
  
  const properties: Record<string, any> = {
    '@context': {
      oneOf: [
        { type: 'string' },
        { type: 'array' },
        { type: 'object' }
      ]
    },
    '@type': {
      oneOf: [
        { const: typePrefix },
        { 
          type: 'array',
          contains: { const: typePrefix }
        }
      ]
    },
    '@id': {
      type: 'string',
      format: 'uri'
    }
  };

  // Add user-defined fields
  fields.forEach(field => {
    const property: any = {
      type: field.type
    };

    if (field.description) {
      property.description = field.description;
    }

    // Add type-specific validation
    if (field.type === 'string') {
      if (field.format) property.format = field.format;
      if (field.minLength !== undefined) property.minLength = field.minLength;
      if (field.maxLength !== undefined) property.maxLength = field.maxLength;
      if (field.pattern) property.pattern = field.pattern;
      if (field.enum?.length) property.enum = field.enum;
    } else if (field.type === 'number') {
      if (field.minimum !== undefined) property.minimum = field.minimum;
      if (field.maximum !== undefined) property.maximum = field.maximum;
      if (field.exclusiveMinimum !== undefined) property.exclusiveMinimum = field.exclusiveMinimum;
      if (field.exclusiveMaximum !== undefined) property.exclusiveMaximum = field.exclusiveMaximum;
      if (field.multipleOf !== undefined) property.multipleOf = field.multipleOf;
    } else if (field.type === 'array') {
      if (field.minItems !== undefined) property.minItems = field.minItems;
      if (field.maxItems !== undefined) property.maxItems = field.maxItems;
      if (field.uniqueItems !== undefined) property.uniqueItems = field.uniqueItems;
      if (field.items) {
        // TODO: Handle array items properly
        property.items = { type: field.items.type };
      }
    } else if (field.type === 'object') {
      if (field.additionalProperties !== undefined) property.additionalProperties = field.additionalProperties;
      if (field.minProperties !== undefined) property.minProperties = field.minProperties;
      if (field.maxProperties !== undefined) property.maxProperties = field.maxProperties;
      if (field.properties) {
        // TODO: Handle nested properties
        property.properties = field.properties;
      }
    } else if (field.type === 'relationship') {
      if (field.relationshipConfig?.targetType) {
        if (field.relationshipConfig.cardinality === 'one') {
          // Single relationship
          property.type = 'object';
          property.properties = {
            '@id': { type: 'string', format: 'uri' },
            '@type': { const: field.relationshipConfig.targetType }
          };
          property.required = ['@id', '@type'];
        } else {
          // Multiple relationships
          property.type = 'array';
          property.items = {
            type: 'object',
            properties: {
              '@id': { type: 'string', format: 'uri' },
              '@type': { const: field.relationshipConfig.targetType }
            },
            required: ['@id', '@type']
          };
        }
      } else {
        // Fallback if no target type configured
        property.type = 'object';
      }
    }

    properties[field.name] = property;
  });

  const required = ['@type', '@id', ...fields.filter(f => f.required).map(f => f.name)];

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties,
    required,
    additionalProperties: false
  };
}

export function generateContextSchema(
  fields: FieldDefinition[],
  namespace: string,
  targetType: string
): ContextSchema {
  const context: any = {
    '@protected': true,
    [namespace]: `https://example.org/${namespace}#`,
    'schema': 'https://schema.org/',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',
    [targetType]: {
      '@id': `${namespace}:${targetType}`,
      '@type': '@id'
    }
  };

  // Add field mappings
  fields.forEach(field => {
    if (field.type === 'string') {
      context[field.name] = {
        '@id': `schema:${field.name}`,
        '@type': 'xsd:string'
      };
    } else if (field.type === 'number') {
      context[field.name] = {
        '@id': `schema:${field.name}`,
        '@type': 'xsd:decimal'
      };
    } else if (field.type === 'boolean') {
      context[field.name] = {
        '@id': `schema:${field.name}`,
        '@type': 'xsd:boolean'
      };
    } else if (field.type === 'array') {
      context[field.name] = {
        '@id': `schema:${field.name}`,
        '@container': '@list'
      };
    } else if (field.type === 'relationship') {
      // Relationship mapping
      const relationshipContext: any = {
        '@id': `${namespace}:${field.name}`,
        '@type': '@id'
      };
      
      // Add container type for multiple relationships
      if (field.relationshipConfig?.cardinality === 'many') {
        relationshipContext['@container'] = field.relationshipConfig.container || '@set';
      }
      
      context[field.name] = relationshipContext;
    } else {
      // Default mapping for objects and other types
      context[field.name] = `schema:${field.name}`;
    }
  });

  return { '@context': context };
}

export function validateFieldName(name: string, existingNames: string[]): string | null {
  if (!name.trim()) {
    return 'Field name is required';
  }
  
  if (name.startsWith('@')) {
    return 'Field names cannot start with @';
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
    return 'Field name must start with a letter and contain only letters, numbers, and underscores';
  }
  
  if (existingNames.includes(name)) {
    return 'Field name already exists';
  }
  
  return null;
}

export function generateFieldId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}