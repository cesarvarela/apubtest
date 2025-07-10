import { DrizzleInstance } from '@/db';
import { createDatabase } from '@/globalSetup';
import { SchemaManager } from '@/lib/SchemaManager';
import { Validator } from '@/lib/Validator';
import { describe, beforeEach, beforeAll, it, expect } from 'vitest';
import { SchemaObject } from 'ajv';

describe('Validator', () => {
  let schemaManager: SchemaManager
  let validator: Validator;
  let db: DrizzleInstance;

  beforeAll(async () => {
    [db] = await createDatabase();
  });

  beforeEach(async () => {
    schemaManager = new SchemaManager(db, 'https://example.org/core', 'https://example.org/aiid', 'aiid');
    validator = new Validator(schemaManager);
    
    // Setup test schemas
    await setupTestSchemas();
  });

  async function setupTestSchemas() {
    // Core Incident schema (simpler version)
    const coreIncidentSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/core-schema.json",
      title: "Core Incident",
      type: "object",
      required: ["@id", "title"],
      properties: {
        "@context": {
          type: "array",
          items: { type: "string", format: "uri" }
        },
        "@type": { 
          type: ["string", "array"],
          items: { type: "string" }
        },
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" },
        "name": { type: "string" }
      },
      additionalProperties: true
    };

    // Core Organization schema
    const coreOrganizationSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/core-organization.json",
      title: "Core Organization",
      type: "object",
      required: ["@type", "@id", "name"],
      properties: {
        "@type": { enum: ["core:Organization"] },
        "@id": { type: "string", format: "uri" },
        "name": { type: "string" }
      },
      additionalProperties: false
    };

    // AIID extended Incident schema with direct properties
    const aiidIncidentSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/aiid/schemas/aiid-incident.json",
      title: "AIID Extended Incident",
      type: "object",
      required: ["@id", "title", "deployedBy"],
      properties: {
        "@context": {
          type: "array",
          items: { type: "string", format: "uri" }
        },
        "@type": { 
          type: ["string", "array"],
          items: { type: "string" }
        },
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" },
        "name": { type: "string" },
        "deployedBy": {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["@type", "@id", "name"],
            properties: {
              "@type": { enum: ["core:Person", "core:Organization"] },
              "@id": { type: "string", format: "uri" },
              "name": { type: "string" }
            },
            additionalProperties: false
          }
        },
        "reports": {
          type: "array",
          items: {
            type: "object",
            required: ["@type", "@id", "title", "url"],
            properties: {
              "@type": { const: "aiid:Report" },
              "@id": { type: "string", format: "uri" },
              "title": { type: "string" },
              "url": { type: "string", format: "uri" }
            },
            additionalProperties: false
          }
        }
      },
      additionalProperties: true
    };

    // AIID Report schema
    const aiidReportSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/aiid/schemas/aiid-report.json",
      title: "AIID Report",
      type: "object",
      required: ["@type", "@id", "title", "url"],
      properties: {
        "@type": { const: "aiid:Report" },
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" },
        "url": { type: "string", format: "uri" }
      },
      additionalProperties: false
    };

    // Save schemas to database with targetType
    await schemaManager.save('validation', 'core', 'core:Incident', coreIncidentSchema);
    await schemaManager.save('validation', 'core', 'core:Organization', coreOrganizationSchema);
    await schemaManager.save('validation', 'aiid', 'aiid:Incident', aiidIncidentSchema);
    await schemaManager.save('validation', 'aiid', 'aiid:Report', aiidReportSchema);
  }

  describe('validate', () => {
    it('should validate a simple core incident payload', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": ["core:Incident"],
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });

    it('should validate a complex AIID incident payload', async () => {
      const payload = {
        "@context": [
          "https://example.org/core/context",
          "https://example.org/aiid/context"
        ],
        "@type": [
          "core:Incident",
          "aiid:Incident"
        ],
        "@id": "https://aiid.example.org/incident/42",
        "title": "Robot mis-classification leads to recall",
        "deployedBy": [
          {
            "@type": "core:Organization",
            "@id": "https://example.org/org/AcmeCorp",
            "name": "Acme Corp"
          }
        ],
        "reports": [
          {
            "@type": "aiid:Report",
            "@id": "https://example.org/report/123",
            "title": "Initial press coverage",
            "url": "https://news.example.com/story/abc"
          }
        ]
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });

    it('should validate multiple types in @type array', async () => {
      const payload = {
        "@context": [
          "https://example.org/core/context",
          "https://example.org/aiid/context"
        ],
        "@type": [
          "core:Incident",
          "aiid:Incident"
        ],
        "@id": "https://aiid.example.org/incident/42",
        "title": "Robot mis-classification leads to recall",
        "deployedBy": [
          {
            "@type": "core:Organization",
            "@id": "https://example.org/org/AcmeCorp",
            "name": "Acme Corp"
          }
        ]
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });

    it('should fail validation when required fields are missing', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": ["core:Incident"],
        "@id": "https://example.org/incident/1"
        // Missing required "title" field
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "core:Incident"/);
    });

    it('should fail validation when deployedBy is missing from AIID incident', async () => {
      const payload = {
        "@context": [
          "https://example.org/core/context",
          "https://example.org/aiid/context"
        ],
        "@type": [
          "core:Incident",
          "aiid:Incident"
        ],
        "@id": "https://aiid.example.org/incident/42",
        "title": "Robot mis-classification leads to recall"
        // Missing required "deployedBy" field for AIID incidents
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "aiid:Incident"/);
    });

    it('should fail validation when deployedBy array is empty', async () => {
      const payload = {
        "@context": [
          "https://example.org/core/context",
          "https://example.org/aiid/context"
        ],
        "@type": [
          "core:Incident",
          "aiid:Incident"
        ],
        "@id": "https://aiid.example.org/incident/42",
        "title": "Robot mis-classification leads to recall",
        "deployedBy": [] // Should have minItems: 1
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "aiid:Incident"/);
    });

    it('should fail validation when report has invalid structure', async () => {
      const payload = {
        "@context": [
          "https://example.org/core/context",
          "https://example.org/aiid/context"
        ],
        "@type": [
          "core:Incident",
          "aiid:Incident"
        ],
        "@id": "https://aiid.example.org/incident/42",
        "title": "Robot mis-classification leads to recall",
        "deployedBy": [
          {
            "@type": "core:Organization",
            "@id": "https://example.org/org/AcmeCorp",
            "name": "Acme Corp"
          }
        ],
        "reports": [
          {
            "@type": "aiid:Report",
            "@id": "https://example.org/report/123",
            "title": "Initial press coverage"
            // Missing required "url" field
          }
        ]
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "aiid:Incident"/);
    });

    it('should fail validation when @id is not a valid URI', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": ["core:Incident"],
        "@id": "invalid-uri", // Should be a valid URI
        "title": "Test incident"
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "core:Incident"/);
    });

    it('should fail validation when additional properties are present', async () => {
      // Use aiid:Incident schema which has additionalProperties: true in the allOf structure
      // but we'll create a stricter schema just for this test
      const strictSchema: SchemaObject = {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "https://example.org/core/schemas/core-strict.json",
        title: "Core Incident Strict",
        type: "object",
        required: ["@id", "title"],
        properties: {
          "@context": {
            type: "array",
            items: { type: "string", format: "uri" }
          },
          "@type": { 
            type: "array", 
            items: { type: "string" } 
          },
          "@id": { type: "string", format: "uri" },
          "title": { type: "string" }
        },
        additionalProperties: false // Strict: no additional properties
      };

      // Save a strict schema for testing
      await schemaManager.save('validation', 'core', 'core:StrictIncident', strictSchema);

      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": ["core:StrictIncident"],
        "@id": "https://example.org/incident/1",
        "title": "Test incident",
        "unexpectedField": "This should not be allowed"
      };

      await expect(validator.validate(payload)).rejects.toThrow(/Validation failed for type "core:StrictIncident"/);
    });

    it('should throw error when no @type is present', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
        // Missing @type
      };

      await expect(validator.validate(payload)).rejects.toThrow('No types found in payload to validate against');
    });

    it('should throw error when @type is empty array', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": [], // Empty array
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
      };

      await expect(validator.validate(payload)).rejects.toThrow('No types found in payload to validate against');
    });

    it('should handle single @type value (not array)', async () => {
      const payload = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident", // Single value, not array
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });

    it('should validate organization entity correctly', async () => {
      const payload = {
        "@type": "core:Organization",
        "@id": "https://example.org/org/AcmeCorp",
        "name": "Acme Corp"
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });

    it('should validate report entity correctly', async () => {
      const payload = {
        "@type": "aiid:Report",
        "@id": "https://example.org/report/123",
        "title": "Initial press coverage",
        "url": "https://news.example.com/story/abc"
      };

      await expect(validator.validate(payload)).resolves.toBeUndefined();
    });
  });

  describe('extractTypesFromPayload', () => {
    it('should extract array of types', () => {
      const payload = {
        "@type": ["core:Incident", "aiid:Incident"]
      };

      const types = validator['extractTypesFromPayload'](payload);
      expect(types).toEqual(["core:Incident", "aiid:Incident"]);
    });

    it('should extract single type as array', () => {
      const payload = {
        "@type": "core:Incident"
      };

      const types = validator['extractTypesFromPayload'](payload);
      expect(types).toEqual(["core:Incident"]);
    });

    it('should return empty array when no @type present', () => {
      const payload = {
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
      };

      const types = validator['extractTypesFromPayload'](payload);
      expect(types).toEqual([]);
    });

    it('should return empty array when @type is null', () => {
      const payload = {
        "@type": null,
        "@id": "https://example.org/incident/1",
        "title": "Test incident"
      };

      const types = validator['extractTypesFromPayload'](payload);
      expect(types).toEqual([]);
    });
  });

  describe('getNamespaceFromType', () => {
    it('should extract namespace from prefixed type', () => {
      const namespace = validator['getNamespaceFromType']('core:Incident');
      expect(namespace).toBe('core');
    });

    it('should extract namespace from aiid type', () => {
      const namespace = validator['getNamespaceFromType']('aiid:Report');
      expect(namespace).toBe('aiid');
    });

    it('should return default namespace for unprefixed type', () => {
      const namespace = validator['getNamespaceFromType']('Incident');
      expect(namespace).toBe('aiid'); // Default namespace from constructor
    });

    it('should handle empty string', () => {
      const namespace = validator['getNamespaceFromType']('');
      expect(namespace).toBe('aiid'); // Default namespace
    });
  });
});