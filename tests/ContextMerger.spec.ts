import { describe, it, expect, vi, afterEach } from 'vitest';
import { ContextMerger } from '../lib/ContextMerger';

describe('ContextMerger', () => {
  // Mock console.warn to avoid cluttering test output
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe('mergeContexts', () => {
    it('should merge basic contexts without conflicts', () => {
      const context1 = {
        "@context": {
          "schema": "https://schema.org/",
          "name": {
            "@id": "schema:name",
            "@type": "@id"
          }
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#",
          "title": {
            "@id": "core:title",
            "@type": "xsd:string"
          }
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#",
          "name": {
            "@id": "schema:name",
            "@type": "@id"
          },
          "title": {
            "@id": "core:title",
            "@type": "xsd:string"
          }
        }
      });
    });

    it('should merge namespace definitions correctly', () => {
      const context1 = {
        "@context": {
          "schema": "https://schema.org/",
          "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#",
          "foaf": "http://xmlns.com/foaf/0.1/"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
          "core": "https://example.com/core#",
          "foaf": "http://xmlns.com/foaf/0.1/"
        }
      });
    });

    it('should merge type definitions with namespaced types', () => {
      const context1 = {
        "@context": {
          "core": "https://example.com/core#",
          "Incident": "core:Incident",
          "Organization": "core:Organization"
        }
      };

      const context2 = {
        "@context": {
          "aiid": "https://aiid.com/ns#",
          "Report": "aiid:Report",
          "Entity": "aiid:Entity"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "core": "https://example.com/core#",
          "aiid": "https://aiid.com/ns#",
          "Incident": "core:Incident",
          "Organization": "core:Organization",
          "Report": "aiid:Report",
          "Entity": "aiid:Entity"
        }
      });
    });

    it('should handle property definitions with complex objects', () => {
      const context1 = {
        "@context": {
          "schema": "https://schema.org/",
          "name": {
            "@id": "schema:name",
            "@type": "xsd:string",
            "@container": "@language"
          }
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#",
          "description": {
            "@id": "core:description",
            "@type": "xsd:string"
          }
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#",
          "name": {
            "@id": "schema:name",
            "@type": "xsd:string",
            "@container": "@language"
          },
          "description": {
            "@id": "core:description",
            "@type": "xsd:string"
          }
        }
      });
    });

    it('should handle @protected metadata correctly', () => {
      const context1 = {
        "@context": {
          "@protected": true,
          "schema": "https://schema.org/"
        }
      };

      const context2 = {
        "@context": {
          "@protected": false,
          "core": "https://example.com/core#"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result["@context"]["@protected"]).toBe(true);
      expect(result["@context"]["schema"]).toBe("https://schema.org/");
      expect(result["@context"]["core"]).toBe("https://example.com/core#");
    });

    it('should preserve other @ metadata', () => {
      const context1 = {
        "@context": {
          "@version": "1.1",
          "@import": "https://example.com/base.jsonld",
          "schema": "https://schema.org/"
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "@version": "1.1",
          "@import": "https://example.com/base.jsonld",
          "schema": "https://schema.org/",
          "core": "https://example.com/core#"
        }
      });
    });

    it('should warn on type definition conflicts', () => {
      const context1 = {
        "@context": {
          "core": "https://example.com/core#",
          "Incident": "core:Incident"
        }
      };

      const context2 = {
        "@context": {
          "aiid": "https://aiid.com/ns#",
          "Incident": "aiid:Incident"  // Conflict!
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Type conflict for 'Incident'")
      );
      
      // First definition should win
      expect(result["@context"]["Incident"]).toBe("core:Incident");
    });

    it('should warn on property definition conflicts', () => {
      const context1 = {
        "@context": {
          "name": {
            "@id": "schema:name",
            "@type": "xsd:string"
          }
        }
      };

      const context2 = {
        "@context": {
          "name": {
            "@id": "foaf:name",
            "@type": "xsd:string"
          }
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Property conflict for 'name'")
      );
      
      // First definition should win
      expect(result["@context"]["name"]).toEqual({
        "@id": "schema:name",
        "@type": "xsd:string"
      });
    });

    it('should handle empty contexts array', () => {
      const result = ContextMerger.mergeContexts([]);

      expect(result).toEqual({
        "@context": {}
      });
    });

    it('should handle single context', () => {
      const context = {
        "@context": {
          "schema": "https://schema.org/",
          "name": "schema:name"
        }
      };

      const result = ContextMerger.mergeContexts([context]);

      expect(result).toEqual(context);
    });

    it('should handle contexts with nested @context (should skip)', () => {
      const context1 = {
        "@context": {
          "@context": "https://should.be/skipped",
          "schema": "https://schema.org/"
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#"
        }
      });
      expect(result["@context"]["@context"]).toBeUndefined();
    });

    it('should handle real-world incident context merge', () => {
      const coreContext = {
        "@context": {
          "@protected": true,
          "core": "https://incidentdatabase.ai/core#",
          "schema": "https://schema.org/",
          "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
          "Incident": "core:Incident",
          "Organization": "core:Organization",
          "Person": "core:Person"
        }
      };

      const incidentContext = {
        "@context": {
          "title": {
            "@id": "schema:name",
            "@type": "xsd:string"
          },
          "description": {
            "@id": "schema:description",
            "@type": "xsd:string"
          },
          "deployedBy": {
            "@id": "core:deployedBy",
            "@type": "@id"
          }
        }
      };

      const result = ContextMerger.mergeContexts([coreContext, incidentContext]);

      expect(result).toEqual({
        "@context": {
          "@protected": true,
          "core": "https://incidentdatabase.ai/core#",
          "schema": "https://schema.org/",
          "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
          "Incident": "core:Incident",
          "Organization": "core:Organization", 
          "Person": "core:Person",
          "title": {
            "@id": "schema:name",
            "@type": "xsd:string"
          },
          "description": {
            "@id": "schema:description",
            "@type": "xsd:string"
          },
          "deployedBy": {
            "@id": "core:deployedBy",
            "@type": "@id"
          }
        }
      });
    });

    it('should handle contexts with different string property patterns', () => {
      const context1 = {
        "@context": {
          "schema": "https://schema.org/",
          "simpleProperty": "schema:name",  // Simple string with colon
          "urlProperty": "https://example.com/prop"  // URL string
        }
      };

      const context2 = {
        "@context": {
          "core": "https://example.com/core#",
          "anotherProperty": "core:description",
          "nonColonString": "just-a-string"  // String without colon or ://
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#",
          "simpleProperty": "schema:name",
          "urlProperty": "https://example.com/prop",
          "anotherProperty": "core:description",
          "nonColonString": "just-a-string"
        }
      });
    });

    it('should identify namespace definitions vs type definitions correctly', () => {
      const context = {
        "@context": {
          "schema": "https://schema.org/",  // Namespace (has ://)
          "core": "https://example.com/core#",  // Namespace (has ://)
          "Incident": "core:Incident",  // Type (has : but no ://)
          "Person": "schema:Person",  // Type (has : but no ://)
          "regularString": "no-special-chars"  // Neither
        }
      };

      const result = ContextMerger.mergeContexts([context]);

      expect(result).toEqual(context);
    });

    it('should handle multiple contexts with overlapping namespace definitions', () => {
      const context1 = {
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#"
        }
      };

      const context2 = {
        "@context": {
          "schema": "https://schema.org/",  // Same namespace, should not conflict
          "aiid": "https://aiid.com/ns#"
        }
      };

      const result = ContextMerger.mergeContexts([context1, context2]);

      expect(result).toEqual({
        "@context": {
          "schema": "https://schema.org/",
          "core": "https://example.com/core#",
          "aiid": "https://aiid.com/ns#"
        }
      });
      
      // Should not have logged any warnings for identical namespace definitions
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});