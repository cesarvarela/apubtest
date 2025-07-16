import { DrizzleInstance } from '@/db';
import { createDatabase } from '@/globalSetup';
import { ContentManager } from '@/lib/ContentManager';
import { SchemaManager } from '@/lib/SchemaManager';
import { Validator } from '@/lib/Validator';
import { Content, Schema } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { describe, beforeEach, beforeAll, it, expect } from 'vitest';
import { SchemaObject } from 'ajv';

describe('ContentManager', () => {
  let contentManager: ContentManager;
  let schemaManager: SchemaManager;
  let validator: Validator;
  let db: DrizzleInstance;

  beforeAll(async () => {
    [db] = await createDatabase();
  });

  beforeEach(async () => {
    // Initialize managers
    schemaManager = new SchemaManager(db, 'https://example.org/core', 'https://example.org/aiid', 'aiid');
    validator = new Validator(schemaManager);
    contentManager = new ContentManager(db, schemaManager, validator);
    
    // Clean up any existing data to ensure test isolation
    await db.delete(Content);
    await db.delete(Schema).where(eq(Schema.isActive, true));
    
    // Setup test schemas
    await setupTestSchemas();
  });

  async function setupTestSchemas() {
    // Core Incident schema
    const coreIncidentSchema: SchemaObject = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "https://example.org/core/schemas/core-incident.json",
      title: "Core Incident",
      type: "object",
      required: ["@id", "@type", "title"],
      properties: {
        "@context": {
          type: "array",
          items: { type: "string", format: "uri" }
        },
        "@type": { 
          type: "string"
        },
        "@id": { type: "string", format: "uri" },
        "title": { type: "string" },
        "description": { type: "string" }
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
        "@type": { const: "core:Organization" },
        "@id": { type: "string", format: "uri" },
        "name": { type: "string" },
        "description": { type: "string" }
      },
      additionalProperties: true
    };

    // Save schemas to database
    await schemaManager.save('validation', 'core', 'core:Incident', coreIncidentSchema);
    await schemaManager.save('validation', 'core', 'core:Organization', coreOrganizationSchema);
  }

  describe('constructor', () => {
    it('should create a ContentManager instance with correct properties', () => {
      expect(contentManager).toBeDefined();
      expect(contentManager.db).toBe(db);
      expect(contentManager.schemaManager).toBe(schemaManager);
      expect(contentManager.validator).toBe(validator);
    });
  });

  describe('save() - create content', () => {
    it('should create new content with valid data', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident",
        "description": "A test incident for unit testing"
      };

      const result = await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      expect(result).toBeDefined();
      expect(result.action).toBe('created');
      expect(result.id).toBeDefined();
    });
  });

  describe('save() - update content', () => {
    it('should update existing content', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Original Title",
        "description": "Original description"
      };

      // Create initial content
      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      // Update the content
      const updatedData = {
        ...testData,
        "title": "Updated Title",
        "description": "Updated description"
      };

      const result = await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', updatedData);

      expect(result.action).toBe('updated');
      
      // Verify the update
      const retrieved = await contentManager.getByUri('https://example.org/incident/1');
      expect(retrieved.data.title).toBe('Updated Title');
      expect(retrieved.data.description).toBe('Updated description');
    });
  });

  describe('getByUri()', () => {
    it('should retrieve content by URI', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      const retrieved = await contentManager.getByUri('https://example.org/incident/1');

      expect(retrieved).toBeDefined();
      expect(retrieved.uri).toBe('https://example.org/incident/1');
      expect(retrieved.contentType).toBe('core:Incident');
      expect(retrieved.namespace).toBe('core');
      expect(retrieved.data.title).toBe('Test Incident');
    });

    it('should return null for non-existent URI', async () => {
      const retrieved = await contentManager.getByUri('https://example.org/nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getByType()', () => {
    it('should retrieve content by type and namespace', async () => {
      const incidentData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      const orgData = {
        "@type": "core:Organization",
        "@id": "https://example.org/org/1",
        "name": "Test Organization"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', incidentData);
      await contentManager.save('core:Organization', 'core', 'https://example.org/org/1', orgData);

      const incidents = await contentManager.getByType('core:Incident', 'core');
      const organizations = await contentManager.getByType('core:Organization', 'core');

      expect(incidents).toHaveLength(1);
      expect(incidents[0].contentType).toBe('core:Incident');
      expect(organizations).toHaveLength(1);
      expect(organizations[0].contentType).toBe('core:Organization');
    });

    it('should retrieve content by type without namespace filter', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      const results = await contentManager.getByType('core:Incident');
      expect(results).toHaveLength(1);
      expect(results[0].contentType).toBe('core:Incident');
    });
  });

  describe('getByNamespace()', () => {
    it('should retrieve content by namespace', async () => {
      const coreIncident = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Core Incident"
      };

      const coreOrg = {
        "@type": "core:Organization",
        "@id": "https://example.org/org/1",
        "name": "Core Organization"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', coreIncident);
      await contentManager.save('core:Organization', 'core', 'https://example.org/org/1', coreOrg);

      const coreContent = await contentManager.getByNamespace('core');
      expect(coreContent).toHaveLength(2);
      expect(coreContent.every(item => item.namespace === 'core')).toBe(true);
    });

    it('should retrieve all content when namespace is empty string', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      const allContent = await contentManager.getByNamespace('');
      expect(allContent.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('delete()', () => {
    it('should delete content by URI', async () => {
      const testData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', testData);

      // Verify content exists
      let retrieved = await contentManager.getByUri('https://example.org/incident/1');
      expect(retrieved).toBeDefined();

      // Delete content
      const deleteResult = await contentManager.delete('https://example.org/incident/1');
      expect(deleteResult.id).toBeDefined();

      // Verify content is deleted
      retrieved = await contentManager.getByUri('https://example.org/incident/1');
      expect(retrieved).toBeNull();
    });
  });

  describe('addRelationship()', () => {
    it('should add a relationship by manually updating content data', async () => {
      // Create incident and organization
      const incidentData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      const orgData = {
        "@type": "core:Organization",
        "@id": "https://example.org/org/1",
        "name": "Test Organization"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', incidentData);
      await contentManager.save('core:Organization', 'core', 'https://example.org/org/1', orgData);

      // Add relationship by updating the incident data directly
      const updatedIncidentData = {
        ...incidentData,
        "organization": {
          "@id": "https://example.org/org/1",
          "@type": "core:Organization",
          "name": "Test Organization"
        }
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', updatedIncidentData);

      // Verify the relationship exists
      const retrieved = await contentManager.getByUri('https://example.org/incident/1');
      expect(retrieved.data.organization).toBeDefined();
      expect(retrieved.data.organization['@id']).toBe('https://example.org/org/1');
    });
  });

  describe('removeRelationship()', () => {
    it('should remove a relationship by manually updating content data', async () => {
      // Create content with a relationship
      const incidentData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident",
        "organization": {
          "@id": "https://example.org/org/1",
          "@type": "core:Organization",
          "name": "Test Organization"
        }
      };

      const orgData = {
        "@type": "core:Organization",
        "@id": "https://example.org/org/1",
        "name": "Test Organization"
      };

      await contentManager.save('core:Organization', 'core', 'https://example.org/org/1', orgData);
      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', incidentData);

      // Remove the relationship by updating without it
      const updatedIncidentData = {
        "@context": ["https://example.org/core/context"],
        "@type": "core:Incident",
        "@id": "https://example.org/incident/1",
        "title": "Test Incident"
      };

      await contentManager.save('core:Incident', 'core', 'https://example.org/incident/1', updatedIncidentData);

      // Verify the relationship is removed
      const retrieved = await contentManager.getByUri('https://example.org/incident/1');
      expect(retrieved.data.organization).toBeUndefined();
    });
  });
});