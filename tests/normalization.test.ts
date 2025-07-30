import { describe, it, expect } from 'vitest';
import { normalizeEntities } from '../lib/normalization';
import sampleData from '../data/sample-aiid-converted.json';

describe('Normalization Function', () => {
  it('should extract all entity types from sample data', () => {
    const result = normalizeEntities(sampleData);
    
    // Verify we have all expected entity types
    expect(result.extracted).toHaveProperty('aiid:Incident');
    expect(result.extracted).toHaveProperty('aiid:Report');
    expect(result.extracted).toHaveProperty('core:Person');
    expect(result.extracted).toHaveProperty('core:Organization');
  });

  it('should return normalized root as array of incident references only', () => {
    const result = normalizeEntities(sampleData);
    
    // Should be array since sample data is array
    expect(Array.isArray(result.normalized)).toBe(true);
    
    // Each item should only have @type and @id
    if (Array.isArray(result.normalized)) {
      result.normalized.forEach((item: any) => {
        expect(item).toHaveProperty('@type');
        expect(item).toHaveProperty('@id');
        expect(item['@type']).toBe('aiid:Incident');
        // Should not have other properties like title, incident_id, etc.
        expect(Object.keys(item)).toEqual(['@type', '@id']);
      });
    }
  });

  it('should extract correct number of incidents', () => {
    const result = normalizeEntities(sampleData);
    
    // Sample data should have 2 incidents
    expect(result.extracted['aiid:Incident']).toHaveLength(2);
    
    // Verify incidents have full properties
    const incidents = result.extracted['aiid:Incident'];
    incidents.forEach((incident: any) => {
      expect(incident).toHaveProperty('@type', 'aiid:Incident');
      expect(incident).toHaveProperty('@id');
      expect(incident).toHaveProperty('incident_id');
      expect(incident).toHaveProperty('title');
      expect(incident).toHaveProperty('deployedBy');
      expect(incident).toHaveProperty('reports');
    });
  });

  it('should extract reports with references to persons in authors', () => {
    const result = normalizeEntities(sampleData);
    
    // Should have multiple reports
    expect(result.extracted['aiid:Report'].length).toBeGreaterThan(40);
    
    // Check first report has proper structure
    const firstReport = result.extracted['aiid:Report'][0];
    expect(firstReport).toHaveProperty('@type', 'aiid:Report');
    expect(firstReport).toHaveProperty('@id');
    expect(firstReport).toHaveProperty('title');
    expect(firstReport).toHaveProperty('authors');
    
    // Authors should be references, not full objects
    if (firstReport.authors && firstReport.authors.length > 0) {
      firstReport.authors.forEach((author: any) => {
        expect(author).toHaveProperty('@type', 'core:Person');
        expect(author).toHaveProperty('@id');
        expect(Object.keys(author)).toEqual(['@type', '@id']);
      });
    }
  });

  it('should extract persons with full properties', () => {
    const result = normalizeEntities(sampleData);
    
    // Should have multiple persons
    expect(result.extracted['core:Person'].length).toBeGreaterThan(50);
    
    // Check persons have proper structure
    const persons = result.extracted['core:Person'];
    persons.forEach((person: any) => {
      expect(person).toHaveProperty('@type', 'core:Person');
      expect(person).toHaveProperty('@id');
      expect(person).toHaveProperty('name');
    });
  });

  it('should extract organizations with full properties', () => {
    const result = normalizeEntities(sampleData);
    
    // Should have a few organizations
    expect(result.extracted['core:Organization'].length).toBeGreaterThan(2);
    
    // Check organizations have proper structure
    const organizations = result.extracted['core:Organization'];
    organizations.forEach((org: any) => {
      expect(org).toHaveProperty('@type', 'core:Organization');
      expect(org).toHaveProperty('@id');
      expect(org).toHaveProperty('name');
    });
  });

  it('should not have duplicate entities', () => {
    const result = normalizeEntities(sampleData);
    
    // Check each entity type for duplicates
    Object.entries(result.extracted).forEach(([type, entities]) => {
      const ids = (entities as any[]).map(entity => entity['@id']);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  it('should have incidents with references in deployedBy, reports, and affectedParties', () => {
    const result = normalizeEntities(sampleData);
    
    const incidents = result.extracted['aiid:Incident'];
    incidents.forEach((incident: any) => {
      // deployedBy should be array of organization references
      if (incident.deployedBy) {
        incident.deployedBy.forEach((org: any) => {
          expect(org).toHaveProperty('@type', 'core:Organization');
          expect(org).toHaveProperty('@id');
          expect(Object.keys(org)).toEqual(['@type', '@id']);
        });
      }
      
      // reports should be array of report references
      if (incident.reports) {
        incident.reports.forEach((report: any) => {
          expect(report).toHaveProperty('@type', 'aiid:Report');
          expect(report).toHaveProperty('@id');
          expect(Object.keys(report)).toEqual(['@type', '@id']);
        });
      }
      
      // affectedParties should be array of references (can be persons or organizations)
      if (incident.affectedParties) {
        incident.affectedParties.forEach((party: any) => {
          expect(party).toHaveProperty('@type');
          expect(party).toHaveProperty('@id');
          expect(['core:Person', 'core:Organization']).toContain(party['@type']);
          expect(Object.keys(party)).toEqual(['@type', '@id']);
        });
      }
    });
  });

  it('should preserve @context in root incidents', () => {
    const result = normalizeEntities(sampleData);
    
    const incidents = result.extracted['aiid:Incident'];
    incidents.forEach((incident: any) => {
      // Root incidents should preserve their @context
      if (incident['@context']) {
        expect(Array.isArray(incident['@context'])).toBe(true);
        expect(incident['@context'].length).toBeGreaterThan(0);
      }
    });
  });

  it('should create reverse relationships for reports pointing back to incidents', () => {
    const result = normalizeEntities(sampleData);
    
    const reports = result.extracted['aiid:Report'];
    reports.forEach((report: any) => {
      // Each report should have reverse_reports pointing back to its incident
      expect(report).toHaveProperty('reverse_reports');
      expect(Array.isArray(report.reverse_reports)).toBe(true);
      
      if (report.reverse_reports && report.reverse_reports.length > 0) {
        report.reverse_reports.forEach((incidentRef: any) => {
          expect(incidentRef).toHaveProperty('@type', 'aiid:Incident');
          expect(incidentRef).toHaveProperty('@id');
          expect(Object.keys(incidentRef)).toEqual(['@type', '@id']);
        });
      }
    });
  });

  it('should create reverse relationships for persons pointing back to reports they authored', () => {
    const result = normalizeEntities(sampleData);
    
    const persons = result.extracted['core:Person'];
    const reports = result.extracted['aiid:Report'];
    
    // Find persons who are actually authors of reports
    const authorPersons = persons.filter((person: any) => {
      return reports.some((report: any) => 
        report.authors && report.authors.some((authorRef: any) => 
          authorRef['@id'] === person['@id']
        )
      );
    });
    
    expect(authorPersons.length).toBeGreaterThan(0);
    
    authorPersons.forEach((person: any) => {
      // Each person who is an author should have reverse_authors pointing back to reports they authored
      expect(person).toHaveProperty('reverse_authors');
      expect(Array.isArray(person.reverse_authors)).toBe(true);
      expect(person.reverse_authors.length).toBeGreaterThan(0);
      
      person.reverse_authors.forEach((reportRef: any) => {
        expect(reportRef).toHaveProperty('@type', 'aiid:Report');
        expect(reportRef).toHaveProperty('@id');
        expect(Object.keys(reportRef)).toEqual(['@type', '@id']);
      });
    });
  });

  it('should create reverse relationships for organizations pointing back to incidents they deployed', () => {
    const result = normalizeEntities(sampleData);
    
    const organizations = result.extracted['core:Organization'];
    organizations.forEach((org: any) => {
      // Each organization should have reverse_deployedBy pointing back to incidents
      expect(org).toHaveProperty('reverse_deployedBy');
      expect(Array.isArray(org.reverse_deployedBy)).toBe(true);
      
      if (org.reverse_deployedBy && org.reverse_deployedBy.length > 0) {
        org.reverse_deployedBy.forEach((incidentRef: any) => {
          expect(incidentRef).toHaveProperty('@type', 'aiid:Incident');
          expect(incidentRef).toHaveProperty('@id');
          expect(Object.keys(incidentRef)).toEqual(['@type', '@id']);
        });
      }
    });
  });

  it('should create reverse relationships for affectedParties', () => {
    const result = normalizeEntities(sampleData);
    
    const incidents = result.extracted['aiid:Incident'];
    
    // Find incidents with affectedParties
    const incidentsWithAffectedParties = incidents.filter((incident: any) => 
      incident.affectedParties && incident.affectedParties.length > 0
    );
    
    expect(incidentsWithAffectedParties.length).toBeGreaterThan(0);
    
    incidentsWithAffectedParties.forEach((incident: any) => {
      incident.affectedParties.forEach((partyRef: any) => {
        const partyType = partyRef['@type'];
        const partyId = partyRef['@id'];
        
        // Find the actual entity
        const entityArray = result.extracted[partyType];
        expect(entityArray).toBeDefined();
        
        const entity = entityArray.find((e: any) => e['@id'] === partyId);
        expect(entity).toBeDefined();
        
        if (entity) {
          // Check reverse relationship exists
          expect(entity).toHaveProperty('reverse_affectedParties');
          expect(Array.isArray(entity.reverse_affectedParties)).toBe(true);
        
          // Verify the reverse relationship points back to this incident
          const reverseRef = entity.reverse_affectedParties.find((ref: any) => 
            ref['@id'] === incident['@id']
          );
          expect(reverseRef).toBeDefined();
          expect(reverseRef['@type']).toBe('aiid:Incident');
        }
      });
    });
  });

  it('should ensure bidirectional relationship consistency', () => {
    const result = normalizeEntities(sampleData);
    
    // Test reports <-> incidents bidirectional consistency
    const incidents = result.extracted['aiid:Incident'];
    const reports = result.extracted['aiid:Report'];
    
    incidents.forEach((incident: any) => {
      if (incident.reports && incident.reports.length > 0) {
        incident.reports.forEach((reportRef: any) => {
          // Find the actual report
          const report = reports.find((r: any) => r['@id'] === reportRef['@id']);
          expect(report).toBeDefined();
          
          if (report) {
            // Verify the report has reverse relationship back to this incident
            expect(report.reverse_reports).toBeDefined();
            const reverseRef = report.reverse_reports.find((ref: any) => 
              ref['@id'] === incident['@id']
            );
            expect(reverseRef).toBeDefined();
            expect(reverseRef['@type']).toBe('aiid:Incident');
          }
        });
      }
    });
  });
});