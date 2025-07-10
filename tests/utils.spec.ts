import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateHiddenAtFieldsUiSchema, mergeSchemas } from '../lib/helpers';

describe('generateHiddenAtFieldsUiSchema', () => {
  // Mock console.log to avoid cluttering test output
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it('should hide @-prefixed fields in main properties', () => {
    const schema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    expect(result).toEqual({
      '@id': { 'ui:widget': 'hidden' },
      '@type': { 'ui:widget': 'hidden' }
    });
    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('should hide @-prefixed fields in array item properties', () => {
    const schema = {
      definitions: {
        Report: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              title: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // When there's no property referencing this definition, no UI schema is generated
    expect(result).toEqual({});
  });

  it('should hide @-prefixed fields in object definitions', () => {
    const schema = {
      definitions: {
        Entity: {
          type: 'object',
          properties: {
            '@id': { type: 'string' },
            '@type': { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // When there's no property referencing this definition, no UI schema is generated
    expect(result).toEqual({});
  });

  it('should handle complex nested schema with multiple definitions', () => {
    const schema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        reports: { 
          type: 'array',
          items: { $ref: '#/definitions/Report' }
        }
      },
      definitions: {
        Report: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              title: { type: 'string' },
              url: { type: 'string' },
              entities: { 
                type: 'array',
                items: { $ref: '#/definitions/Entity' }
              }
            }
          }
        },
        Entity: {
          type: 'object',
          properties: {
            '@id': { type: 'string' },
            '@type': { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    expect(result).toEqual({
      '@id': { 'ui:widget': 'hidden' },
      '@type': { 'ui:widget': 'hidden' },
      reports: {
        items: {
          '@type': { 'ui:widget': 'hidden' },
          '@id': { 'ui:widget': 'hidden' }
        }
      }
    });
  });

  it('should handle nested definitions', () => {
    const schema = {
      definitions: {
        Level1: {
          properties: {
            '@id': { type: 'string' }
          },
          definitions: {
            Level2: {
              properties: {
                '@type': { type: 'string' }
              }
            }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // When there's no property referencing these definitions, no UI schema is generated
    expect(result).toEqual({});
  });

  it('should handle empty or undefined schema gracefully', () => {
    expect(generateHiddenAtFieldsUiSchema({})).toEqual({});
    expect(generateHiddenAtFieldsUiSchema({ properties: {} })).toEqual({});
    expect(generateHiddenAtFieldsUiSchema({ definitions: {} })).toEqual({});
  });

  it('should not hide fields that do not start with @', () => {
    const schema = {
      properties: {
        '@id': { type: 'string' },
        'email': { type: 'string' },
        'type': { type: 'string' },
        '@type': { type: 'string' }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    expect(result).toEqual({
      '@id': { 'ui:widget': 'hidden' },
      '@type': { 'ui:widget': 'hidden' }
    });
    expect(result.email).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  it('should handle real-world incident schema structure', () => {
    // This mimics the actual schema structure from the incident form
    const schema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        reports: {
          type: 'array',
          items: {
            $ref: '#/definitions/reports'
          }
        }
      },
      definitions: {
        reports: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              url: { type: 'string' },
              headline: { type: 'string' }
            }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // Check that main @-fields are hidden
    expect(result['@id']).toEqual({ 'ui:widget': 'hidden' });
    expect(result['@type']).toEqual({ 'ui:widget': 'hidden' });

    // Check that reports array items @-fields are hidden
    expect(result.reports?.items?.['@type']).toEqual({ 'ui:widget': 'hidden' });
    expect(result.reports?.items?.['@id']).toEqual({ 'ui:widget': 'hidden' });

    // Check that non-@-fields are not hidden
    expect(result.title).toBeUndefined();
    expect(result.reports?.items?.url).toBeUndefined();
    expect(result.reports?.items?.headline).toBeUndefined();
  });

  it('should handle schema with direct array properties (no definitions)', () => {
    // Test case for arrays defined directly in properties
    const schema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        reports: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              url: { type: 'string' },
              headline: { type: 'string' }
            }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // Check that main @-fields are hidden
    expect(result['@id']).toEqual({ 'ui:widget': 'hidden' });
    expect(result['@type']).toEqual({ 'ui:widget': 'hidden' });

    // Check that reports array items @-fields are hidden
    expect(result.reports?.items?.['@type']).toEqual({ 'ui:widget': 'hidden' });
    expect(result.reports?.items?.['@id']).toEqual({ 'ui:widget': 'hidden' });

    // Check that non-@-fields are not hidden
    expect(result.title).toBeUndefined();
    expect(result.reports?.items?.url).toBeUndefined();
    expect(result.reports?.items?.headline).toBeUndefined();
  });

  it('should handle property with $ref to array definition (real-world case)', () => {
    // This is the exact pattern that was causing the issue in the incident form
    const schema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        reports: {
          type: 'array',
          items: {
            $ref: '#/definitions/reportArray'
          }
        }
      },
      definitions: {
        reportArray: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              url: { type: 'string' },
              headline: { type: 'string' }
            }
          }
        }
      }
    };

    const result = generateHiddenAtFieldsUiSchema(schema);

    // Check that main @-fields are hidden
    expect(result['@id']).toEqual({ 'ui:widget': 'hidden' });
    expect(result['@type']).toEqual({ 'ui:widget': 'hidden' });

    // Check that reports array items @-fields are hidden (this was the bug)
    expect(result.reports?.items?.['@type']).toEqual({ 'ui:widget': 'hidden' });
    expect(result.reports?.items?.['@id']).toEqual({ 'ui:widget': 'hidden' });

    // Check that non-@-fields are not hidden
    expect(result.title).toBeUndefined();
    expect(result.reports?.items?.url).toBeUndefined();
    expect(result.reports?.items?.headline).toBeUndefined();
  });
});

describe('mergeSchemas', () => {
  it('should merge core and local schemas with basic properties', () => {
    const coreSchema = {
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' }
      },
      required: ['@id']
    };

    const localSchema = {
      $id: 'local-schema',
      definitions: {
        Report: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          }
        }
      },
      allOf: [
        { $ref: '#/definitions/CoreSchema' },
        {
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['title']
        }
      ]
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'local-schema',
      definitions: {
        Report: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          }
        }
      },
      type: 'object',
      properties: {
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['@id', 'title'],
      additionalProperties: false
    });
  });

  it('should handle schemas without properties gracefully', () => {
    const coreSchema = {};
    const localSchema = {
      $id: 'local-schema',
      allOf: [
        { $ref: '#/definitions/CoreSchema' },
        {}
      ]
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'local-schema',
      definitions: undefined,
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    });
  });

  it('should handle schemas without required fields', () => {
    const coreSchema = {
      properties: {
        '@id': { type: 'string' }
      }
    };

    const localSchema = {
      $id: 'local-schema',
      allOf: [
        { $ref: '#/definitions/CoreSchema' },
        {
          properties: {
            title: { type: 'string' }
          }
        }
      ]
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'local-schema',
      definitions: undefined,
      type: 'object',
      properties: {
        '@id': { type: 'string' },
        title: { type: 'string' }
      },
      required: [],
      additionalProperties: false
    });
  });

  it('should handle local schema without allOf structure', () => {
    const coreSchema = {
      properties: {
        '@id': { type: 'string' }
      },
      required: ['@id']
    };

    const localSchema = {
      $id: 'local-schema',
      definitions: {
        SomeDefinition: { type: 'string' }
      }
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'local-schema',
      definitions: {
        SomeDefinition: { type: 'string' }
      },
      type: 'object',
      properties: {
        '@id': { type: 'string' }
      },
      required: ['@id'],
      additionalProperties: false
    });
  });

  it('should handle complex real-world schema merging', () => {
    const coreSchema = {
      properties: {
        '@context': { type: 'string' },
        '@id': { type: 'string' },
        '@type': { type: 'string' }
      },
      required: ['@context', '@type']
    };

    const localSchema = {
      $id: 'https://incidentdatabase.ai/schemas/incident.json',
      definitions: {
        reports: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              url: { type: 'string' },
              headline: { type: 'string' }
            }
          }
        },
        entities: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string' },
              '@id': { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      allOf: [
        { $ref: '#/definitions/CoreSchema' },
        {
          properties: {
            title: { 
              type: 'string',
              description: 'The title of the incident'
            },
            description: { 
              type: 'string',
              description: 'A detailed description of the incident'
            },
            reports: {
              type: 'array',
              items: { $ref: '#/definitions/reports' }
            },
            entities: {
              type: 'array',
              items: { $ref: '#/definitions/entities' }
            }
          },
          required: ['title', 'description']
        }
      ]
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'https://incidentdatabase.ai/schemas/incident.json',
      definitions: {
        reports: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string', const: 'Article' },
              '@id': { type: 'string' },
              url: { type: 'string' },
              headline: { type: 'string' }
            }
          }
        },
        entities: {
          type: 'array',
          items: {
            properties: {
              '@type': { type: 'string' },
              '@id': { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      type: 'object',
      properties: {
        '@context': { type: 'string' },
        '@id': { type: 'string' },
        '@type': { type: 'string' },
        title: { 
          type: 'string',
          description: 'The title of the incident'
        },
        description: { 
          type: 'string',
          description: 'A detailed description of the incident'
        },
        reports: {
          type: 'array',
          items: { $ref: '#/definitions/reports' }
        },
        entities: {
          type: 'array',
          items: { $ref: '#/definitions/entities' }
        }
      },
      required: ['@context', '@type', 'title', 'description'],
      additionalProperties: false
    });
  });

  it('should handle property name conflicts (local should override core)', () => {
    const coreSchema = {
      properties: {
        title: { type: 'string', description: 'Core title' },
        '@id': { type: 'string' }
      },
      required: ['title']
    };

    const localSchema = {
      $id: 'local-schema',
      allOf: [
        { $ref: '#/definitions/CoreSchema' },
        {
          properties: {
            title: { type: 'string', description: 'Local title', maxLength: 100 },
            description: { type: 'string' }
          },
          required: ['description']
        }
      ]
    };

    const result = mergeSchemas(coreSchema, localSchema);

    expect(result).toEqual({
      $id: 'local-schema',
      definitions: undefined,
      type: 'object',
      properties: {
        '@id': { type: 'string' },
        title: { type: 'string', description: 'Local title', maxLength: 100 },
        description: { type: 'string' }
      },
      required: ['title', 'description'],
      additionalProperties: false
    });
  });

  it('should handle empty schemas', () => {
    const result = mergeSchemas({}, {});

    expect(result).toEqual({
      $id: undefined,
      definitions: undefined,
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    });
  });

  it('should handle null/undefined schemas gracefully', () => {
    const coreSchema = {
      properties: {
        '@id': { type: 'string' }
      }
    };

    const result = mergeSchemas(coreSchema, null);

    expect(result).toEqual({
      $id: undefined,
      definitions: undefined,
      type: 'object',
      properties: {
        '@id': { type: 'string' }
      },
      required: [],
      additionalProperties: false
    });
  });
});