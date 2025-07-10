import { DrizzleInstance } from '@/db';
import { createDatabase } from '@/globalSetup';
import { SchemaManager } from '@/lib/SchemaManager';
import { Schema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { describe, beforeEach, beforeAll, it, expect } from 'vitest';
import { SchemaObject } from 'ajv';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let db: DrizzleInstance;
  const coreDomain = 'https://example.org/core';
  const localDomain = 'https://example.org/aiid';
  const namespace = 'aiid';

  beforeAll(async () => {
    [db] = await createDatabase();
  });

  beforeEach(async () => {
    schemaManager = new SchemaManager(db, coreDomain, localDomain, namespace);
    
    // Clean up any existing schemas to ensure test isolation
    await db.delete(Schema).where(eq(Schema.isActive, true));
  });

  describe('constructor', () => {
    it('should create a SchemaManager instance with correct properties', () => {
      expect(schemaManager).toBeDefined();
      expect(schemaManager.db).toBe(db);
      expect(schemaManager.coreDomain).toBe(coreDomain);
      expect(schemaManager.localDomain).toBe(localDomain);
      expect(schemaManager.namespace).toBe(namespace);
    });

    it('should throw error when coreDomain is missing', () => {
      expect(() => {
        new SchemaManager(db, '', localDomain, namespace);
      }).toThrow('Missing required parameter(s): coreDomain');
    });

    it('should throw error when localDomain is missing', () => {
      expect(() => {
        new SchemaManager(db, coreDomain, '', namespace);
      }).toThrow('Missing required parameter(s): localDomain');
    });

    it('should throw error when namespace is missing', () => {
      expect(() => {
        new SchemaManager(db, coreDomain, localDomain, '');
      }).toThrow('Missing required parameter(s): namespace');
    });

    it('should throw error when multiple parameters are missing', () => {
      expect(() => {
        new SchemaManager(db, '', '', '');
      }).toThrow('Missing required parameter(s): coreDomain, localDomain, namespace');
    });
  });

  describe('getDomain', () => {
    it('should return coreDomain for core namespace', () => {
      const domain = schemaManager.getDomain('core');
      expect(domain).toBe(coreDomain);
    });

    it('should return localDomain for local namespace', () => {
      const domain = schemaManager.getDomain('local');
      expect(domain).toBe(localDomain);
    });

    it('should return localDomain for default namespace', () => {
      const domain = schemaManager.getDomain(namespace);
      expect(domain).toBe(localDomain);
    });

    it('should return localDomain when no namespace provided (uses default)', () => {
      const domain = schemaManager.getDomain();
      expect(domain).toBe(localDomain);
    });

    it('should throw error for unknown namespace', () => {
      expect(() => {
        schemaManager.getDomain('unknown');
      }).toThrow('Unknown namespace: unknown');
    });
  });

  describe('getSchemaUrl', () => {
    it('should return correct validation schema URL for core namespace', () => {
      const url = schemaManager.getSchemaUrl('validation', 'core');
      expect(url).toBe(`${coreDomain}/schemas/core-schema.json`);
    });

    it('should return correct validation schema URL for local namespace', () => {
      const url = schemaManager.getSchemaUrl('validation', 'aiid');
      expect(url).toBe(`${localDomain}/schemas/aiid-schema.json`);
    });

    it('should return correct context schema URL for core namespace', () => {
      const url = schemaManager.getSchemaUrl('context', 'core');
      expect(url).toBe(`${coreDomain}/schemas/core-v1.jsonld`);
    });

    it('should return correct context schema URL for local namespace', () => {
      const url = schemaManager.getSchemaUrl('context', 'aiid');
      expect(url).toBe(`${localDomain}/schemas/aiid-v1.jsonld`);
    });

    it('should throw error for unsupported schema type', () => {
      expect(() => {
        schemaManager.getSchemaUrl('invalid' as any, 'core');
      }).toThrow('Unsupported schema type: invalid');
    });
  });

  describe('getSchema', () => {
    const testSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/test-schema.json",
      title: "Test Schema",
      type: "object",
      required: ["@id", "title"],
      properties: {
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" }
      },
      additionalProperties: false
    };

    it('should return schema when it exists', async () => {
      await schemaManager.save('validation', 'core', 'core:Test', testSchema);
      
      const result = await schemaManager.getSchema('validation', 'core', 'core:Test');
      expect(result).toEqual(testSchema);
    });

    it('should return null when schema does not exist', async () => {
      const result = await schemaManager.getSchema('validation', 'core', 'nonexistent:Type');
      expect(result).toBeNull();
    });

    it('should return schema without targetType when targetType is null', async () => {
      await schemaManager.save('validation', 'core', null, testSchema);
      
      const result = await schemaManager.getSchema('validation', 'core', null);
      expect(result).toEqual(testSchema);
    });

    it('should only return active schemas', async () => {
      await schemaManager.save('validation', 'core', 'core:Test', testSchema);
      await schemaManager.delete('validation', 'core', 'core:Test');
      
      const result = await schemaManager.getSchema('validation', 'core', 'core:Test');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid database instance
      const invalidSchemaManager = new SchemaManager(
        { select: () => { throw new Error('Database connection failed'); } } as any,
        coreDomain,
        localDomain,
        namespace
      );

      await expect(invalidSchemaManager.getSchema('validation', 'core', 'core:Test'))
        .rejects.toThrow('Failed to load validation core: Database connection failed}');
    });
  });

  describe('save', () => {
    const validationSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/test-schema.json",
      title: "Test Schema",
      type: "object",
      required: ["@id", "title"],
      properties: {
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" }
      },
      additionalProperties: false
    };

    const contextSchema: SchemaObject = {
      "@context": {
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "Test": "https://example.org/Test"
      },
      $id: "https://example.org/core/schemas/test-context.jsonld"
    };

    it('should create new schema when it does not exist', async () => {
      const result = await schemaManager.save('validation', 'core', 'core:Test', validationSchema);
      
      expect(result.action).toBe('created');
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should update existing schema when it exists', async () => {
      const createResult = await schemaManager.save('validation', 'core', 'core:Test', validationSchema);
      
      const updatedSchema = { ...validationSchema, title: "Updated Test Schema" };
      const updateResult = await schemaManager.save('validation', 'core', 'core:Test', updatedSchema);
      
      expect(updateResult.action).toBe('updated');
      expect(updateResult.id).toBe(createResult.id);
      
      const retrievedSchema = await schemaManager.getSchema('validation', 'core', 'core:Test');
      expect(retrievedSchema?.title).toBe("Updated Test Schema");
    });

    it('should save schema with null targetType', async () => {
      const result = await schemaManager.save('validation', 'core', null, validationSchema);
      
      expect(result.action).toBe('created');
      expect(result.id).toBeDefined();
      
      const retrievedSchema = await schemaManager.getSchema('validation', 'core', null);
      expect(retrievedSchema).toEqual(validationSchema);
    });

    it('should save context schema', async () => {
      const result = await schemaManager.save('context', 'core', 'core:Test', contextSchema);
      
      expect(result.action).toBe('created');
      expect(result.id).toBeDefined();
      
      const retrievedSchema = await schemaManager.getSchema('context', 'core', 'core:Test');
      expect(retrievedSchema).toEqual(contextSchema);
    });

    it('should validate schema structure before saving', async () => {
      const invalidSchema: SchemaObject = {
        type: "object",
        properties: {
          "title": { type: "string" }
        }
      };

      await expect(schemaManager.save('validation', 'core', 'core:Test', invalidSchema))
        .rejects.toThrow('Schema must have a $id property');
    });

    it('should handle database errors gracefully', async () => {
      const invalidSchemaManager = new SchemaManager(
        { 
          select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
          insert: () => { throw new Error('Database insert failed'); }
        } as any,
        coreDomain,
        localDomain,
        namespace
      );

      await expect(invalidSchemaManager.save('validation', 'core', 'core:Test', validationSchema))
        .rejects.toThrow('Failed to save validation core: Database insert failed');
    });
  });

  describe('delete', () => {
    const testSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/test-schema.json",
      title: "Test Schema",
      type: "object",
      required: ["@id", "title"],
      properties: {
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" }
      },
      additionalProperties: false
    };

    it('should mark schema as inactive when deleted', async () => {
      const saveResult = await schemaManager.save('validation', 'core', 'core:Test', testSchema);
      
      const deleteResult = await schemaManager.delete('validation', 'core', 'core:Test');
      expect(deleteResult.id).toBe(saveResult.id);
      
      const retrievedSchema = await schemaManager.getSchema('validation', 'core', 'core:Test');
      expect(retrievedSchema).toBeNull();
    });

    it('should delete schema with null targetType', async () => {
      await schemaManager.save('validation', 'core', null, testSchema);
      
      const deleteResult = await schemaManager.delete('validation', 'core', null);
      expect(deleteResult.id).toBeDefined();
      
      const retrievedSchema = await schemaManager.getSchema('validation', 'core', null);
      expect(retrievedSchema).toBeNull();
    });

    it('should throw error when schema does not exist', async () => {
      await expect(schemaManager.delete('validation', 'core', 'nonexistent:Type'))
        .rejects.toThrow('validation not found for namespace core');
    });

    it('should handle database errors gracefully', async () => {
      const invalidSchemaManager = new SchemaManager(
        { 
          update: () => { throw new Error('Database update failed'); }
        } as any,
        coreDomain,
        localDomain,
        namespace
      );

      await expect(invalidSchemaManager.delete('validation', 'core', 'core:Test'))
        .rejects.toThrow('Failed to delete validation core: Database update failed');
    });
  });

  describe('validateSchemaStructure', () => {
    describe('validation schema validation', () => {
      it('should pass validation for valid schema', () => {
        const validSchema: SchemaObject = {
          $schema: "http://json-schema.org/draft-07/schema#",
          $id: "https://example.org/core/schemas/test-schema.json",
          title: "Test Schema",
          type: "object",
          required: ["@id", "title"],
          properties: {
            "@id": { type: "string", format: "uri" },
            "title": { type: "string" }
          },
          additionalProperties: false
        };

        expect(() => {
          schemaManager.validateSchemaStructure(validSchema, 'validation', 'core');
        }).not.toThrow();
      });

      it('should throw error when $id is missing', () => {
        const invalidSchema: SchemaObject = {
          type: "object",
          properties: {
            "title": { type: "string" }
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidSchema, 'validation', 'core');
        }).toThrow('Schema must have a $id property');
      });

      it('should throw error when type is not object', () => {
        const invalidSchema: SchemaObject = {
          $id: "https://example.org/core/schemas/test-schema.json",
          type: "string"
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidSchema, 'validation', 'core');
        }).toThrow('Validation schema must have type: "object"');
      });

      it('should throw error when type is missing', () => {
        const invalidSchema: SchemaObject = {
          $id: "https://example.org/core/schemas/test-schema.json",
          properties: {
            "title": { type: "string" }
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidSchema, 'validation', 'core');
        }).toThrow('Validation schema must have type: "object"');
      });

      it('should throw error when properties are missing', () => {
        const invalidSchema: SchemaObject = {
          $id: "https://example.org/core/schemas/test-schema.json",
          type: "object"
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidSchema, 'validation', 'core');
        }).toThrow('Validation schema must define properties');
      });
    });

    describe('context schema validation', () => {
      it('should pass validation for valid core context schema', () => {
        const validContextSchema: SchemaObject = {
          "@context": {
            "core": "https://example.org/core#",
            "schema": "https://schema.org/",
            "Incident": { "@id": "core:Incident", "@type": "@id" },
            "title": { "@id": "schema:name", "@type": "xsd:string" }
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(validContextSchema, 'context', 'core');
        }).not.toThrow();
      });

      it('should pass validation for valid extended context schema', () => {
        const validContextSchema: SchemaObject = {
          "@context": {
            "aiid": "https://example.org/aiid#",
            "core": "https://example.org/core#",
            "aiid:Incident": {
              "@id": "aiid:Incident",
              "@context": {
                "Report": { "@id": "aiid:Report", "@type": "@id" },
                "deployedBy": {
                  "@id": "aiid:deployedBy",
                  "@type": "@id",
                  "@container": "@set"
                }
              }
            }
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(validContextSchema, 'context', 'aiid');
        }).not.toThrow();
      });

      it('should throw error when context schema has no @context property', () => {
        const invalidContextSchema: SchemaObject = {
          title: "Invalid Context"
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidContextSchema, 'context', 'core');
        }).toThrow('Context must have a @context property');
      });

      it('should throw error when core context missing schema namespace', () => {
        const invalidContextSchema: SchemaObject = {
          "@context": {
            "core": "https://example.org/core#"
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidContextSchema, 'context', 'core');
        }).toThrow('Core context must define \'schema\' namespace as a string');
      });

      it('should throw error when core context missing core namespace', () => {
        const invalidContextSchema: SchemaObject = {
          "@context": {
            "schema": "https://schema.org/"
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidContextSchema, 'context', 'core');
        }).toThrow('Core context must define "core" namespace');
      });

      it('should throw error when extended context missing core reference', () => {
        const invalidContextSchema: SchemaObject = {
          "@context": {
            "aiid": "https://example.org/aiid#"
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidContextSchema, 'context', 'aiid');
        }).toThrow('Extended context must reference "core" namespace');
      });

      it('should throw error when extended context missing own namespace', () => {
        const invalidContextSchema: SchemaObject = {
          "@context": {
            "core": "https://example.org/core#"
          }
        };

        expect(() => {
          schemaManager.validateSchemaStructure(invalidContextSchema, 'context', 'aiid');
        }).toThrow('Extended context must define "aiid" namespace');
      });
    });
  });

  describe('integration tests', () => {
    it('should handle complete schema lifecycle', async () => {
      const schema: SchemaObject = {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "https://example.org/core/schemas/lifecycle-test.json",
        title: "Lifecycle Test Schema",
        type: "object",
        required: ["@id", "title"],
        properties: {
          "@id": { type: "string", format: "uri" },
          "title": { type: "string" }
        },
        additionalProperties: false
      };

      // Create
      const createResult = await schemaManager.save('validation', 'core', 'core:LifecycleTest', schema);
      expect(createResult.action).toBe('created');

      // Read
      const retrievedSchema = await schemaManager.getSchema('validation', 'core', 'core:LifecycleTest');
      expect(retrievedSchema).toEqual(schema);

      // Update
      const updatedSchema = { ...schema, title: "Updated Lifecycle Test Schema" };
      const updateResult = await schemaManager.save('validation', 'core', 'core:LifecycleTest', updatedSchema);
      expect(updateResult.action).toBe('updated');
      expect(updateResult.id).toBe(createResult.id);

      // Verify update
      const retrievedUpdatedSchema = await schemaManager.getSchema('validation', 'core', 'core:LifecycleTest');
      expect(retrievedUpdatedSchema?.title).toBe("Updated Lifecycle Test Schema");

      // Delete
      const deleteResult = await schemaManager.delete('validation', 'core', 'core:LifecycleTest');
      expect(deleteResult.id).toBe(createResult.id);

      // Verify deletion
      const retrievedDeletedSchema = await schemaManager.getSchema('validation', 'core', 'core:LifecycleTest');
      expect(retrievedDeletedSchema).toBeNull();
    });

    it('should handle multiple schemas with different targetTypes', async () => {
      const incidentSchema: SchemaObject = {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "https://example.org/core/schemas/incident.json",
        title: "Incident Schema",
        type: "object",
        required: ["@id", "title"],
        properties: {
          "@id": { type: "string", format: "uri" },
          "title": { type: "string" }
        },
        additionalProperties: false
      };

      const reportSchema: SchemaObject = {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "https://example.org/core/schemas/report.json",
        title: "Report Schema",
        type: "object",
        required: ["@id", "title", "url"],
        properties: {
          "@id": { type: "string", format: "uri" },
          "title": { type: "string" },
          "url": { type: "string", format: "uri" }
        },
        additionalProperties: false
      };

      // Save both schemas
      await schemaManager.save('validation', 'core', 'core:Incident', incidentSchema);
      await schemaManager.save('validation', 'core', 'core:Report', reportSchema);

      // Retrieve both schemas
      const retrievedIncidentSchema = await schemaManager.getSchema('validation', 'core', 'core:Incident');
      const retrievedReportSchema = await schemaManager.getSchema('validation', 'core', 'core:Report');

      expect(retrievedIncidentSchema).toEqual(incidentSchema);
      expect(retrievedReportSchema).toEqual(reportSchema);

      // Delete one schema
      await schemaManager.delete('validation', 'core', 'core:Incident');

      // Verify only one is deleted
      const retrievedIncidentAfterDelete = await schemaManager.getSchema('validation', 'core', 'core:Incident');
      const retrievedReportAfterDelete = await schemaManager.getSchema('validation', 'core', 'core:Report');

      expect(retrievedIncidentAfterDelete).toBeNull();
      expect(retrievedReportAfterDelete).toEqual(reportSchema);
    });
  });
});
