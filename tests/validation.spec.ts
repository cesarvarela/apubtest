import { SchemaGenerator } from '@/lib/schemas';
import { Validator } from '@/lib/validation';
import { describe, it, expect, beforeEach } from 'vitest';

describe('validateIncident', () => {

  const coreDomain = 'https://incidents.org';
  const localDomain = 'https://aiid.org';

  let schemasGenerator: SchemaGenerator;
  let validator: Validator;

  beforeEach(async () => {
    schemasGenerator = new SchemaGenerator(coreDomain, localDomain, 'aiid');

    validator = new Validator();

    validator.registerSchema(schemasGenerator.coreContextUrl, await schemasGenerator.getCoreSchema());
    validator.registerSchema(schemasGenerator.localContextUrl, await schemasGenerator.getLocalSchema());
  });

  it('should validate a core incident payload successfully', () => {

    const payload = {
      "@context": schemasGenerator.coreContextUrl,
      "@id": "https://example.com/incident/1",
      "@type": "Incident"
    };

    expect(validator.validateIncident(payload)).toBe(true);
  });

  it('should throw error for core incident missing @type', () => {
    const payload = {
      "@context": schemasGenerator.coreContextUrl,
      "@id": "https://example.com/incident/1"
    };
    expect(() => validator.validateIncident(payload)).toThrowError(/Validation failed/);
  });

  it('should validate a local incident payload successfully', () => {

    const payload = {
      "@context": schemasGenerator.localContextUrl,
      "@id": "https://example.com/incident/2",
      "@type": "Incident",
      title: "Valid Title",
      reports: [
        {
          "@type": "Article",
          url: "https://example.com/article/1",
          headline: "An Article"
        }
      ]
    };

    const result = validator.validateIncident(payload);

    expect(result).toBe(true);
  });

  it('should throw error for local incident with short title', () => {

    const payload = {
      "@context": schemasGenerator.localContextUrl,
      "@id": "https://example.com/incident/3",
      "@type": "Incident",
      title: "Shrt",
      reports: [
        {
          "@type": "Article",
          url: "https://example.com/article/1",
          headline: "Headline"
        }
      ]
    };
    
    expect(() => validator.validateIncident(payload)).toThrowError(/Validation failed/);
  });
});