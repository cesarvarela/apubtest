import { describe, it, expect } from 'vitest';
import { 
  discoverEntityTypes, 
  discoverRelationships, 
  analyzeEntityFields,
  discoverRelationshipPaths,
  formatEntityTypeLabel,
  formatRelationshipLabel,
  getCompatibleTargetTypes
} from '../lib/charts/dynamicAnalyzer';
import { normalizeEntities } from '../lib/normalization';
import sampleData from '../data/sample-aiid-converted.json';

describe('Dynamic Analyzer', () => {
  const normalizedData = normalizeEntities(sampleData);

  it('should discover all entity types with counts', () => {
    const entityTypes = discoverEntityTypes(normalizedData);
    
    expect(entityTypes.length).toBeGreaterThan(0);
    
    // Should find all expected types
    const typeNames = entityTypes.map(t => t.type);
    expect(typeNames).toContain('aiid:Incident');
    expect(typeNames).toContain('aiid:Report');
    expect(typeNames).toContain('core:Person');
    expect(typeNames).toContain('core:Organization');
    
    // Should have counts and labels
    entityTypes.forEach(entityType => {
      expect(entityType.count).toBeGreaterThan(0);
      expect(entityType.label).toBeTruthy();
      expect(entityType.sampleEntity).toBeTruthy();
    });
    
    // Should be sorted by count descending
    for (let i = 0; i < entityTypes.length - 1; i++) {
      expect(entityTypes[i].count).toBeGreaterThanOrEqual(entityTypes[i + 1].count);
    }
  });

  it('should format entity type labels correctly', () => {
    expect(formatEntityTypeLabel('aiid:Incident')).toBe('Incidents');
    expect(formatEntityTypeLabel('core:Person')).toBe('Persons');
    expect(formatEntityTypeLabel('core:Organization')).toBe('Organizations');
    expect(formatEntityTypeLabel('aiid:Report')).toBe('Reports');
  });

  it('should analyze fields for incident entities', () => {
    const incidents = normalizedData.extracted['aiid:Incident'];
    const fields = analyzeEntityFields(incidents);
    
    expect(fields.length).toBeGreaterThan(0);
    
    // Should find common incident fields
    const fieldNames = fields.map(f => f.fieldName);
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('incident_id');
    expect(fieldNames).toContain('deployedBy');
    expect(fieldNames).toContain('reports');
    
    // Check field properties
    fields.forEach(field => {
      expect(field.frequency).toBeGreaterThan(0);
      expect(field.frequency).toBeLessThanOrEqual(1);
      expect(field.totalCount).toBeGreaterThan(0);
      expect(field.entityCount).toBe(incidents.length);
      expect(field.type).toMatch(/^(string|number|date|boolean|array|object|reference)$/);
      expect(Array.isArray(field.sampleValues)).toBe(true);
    });
    
    // Should be sorted by frequency descending
    for (let i = 0; i < fields.length - 1; i++) {
      expect(fields[i].frequency).toBeGreaterThanOrEqual(fields[i + 1].frequency);
    }
  });

  it('should infer correct field types', () => {
    const incidents = normalizedData.extracted['aiid:Incident'];
    const fields = analyzeEntityFields(incidents);
    
    const titleField = fields.find(f => f.fieldName === 'title');
    expect(titleField?.type).toBe('string');
    
    const reportsField = fields.find(f => f.fieldName === 'reports');
    expect(reportsField?.type).toBe('reference');
    
    const deployedByField = fields.find(f => f.fieldName === 'deployedBy');
    expect(deployedByField?.type).toBe('reference');
  });

  it('should discover relationships from incidents', () => {
    const relationships = discoverRelationships(normalizedData, 'aiid:Incident');
    
    expect(relationships.length).toBeGreaterThan(0);
    
    // Should find expected relationships
    const relationNames = relationships.map(r => r.relationName);
    expect(relationNames).toContain('deployedBy');
    expect(relationNames).toContain('reports');
    
    // Check relationship properties
    relationships.forEach(rel => {
      expect(rel.sourceType).toBe('aiid:Incident');
      expect(rel.targetTypes.length).toBeGreaterThan(0);
      expect(rel.frequency).toBeGreaterThan(0);
      expect(rel.frequency).toBeLessThanOrEqual(1);
      expect(rel.totalCount).toBeGreaterThan(0);
      expect(rel.label).toBeTruthy();
      expect(typeof rel.isReverse).toBe('boolean');
    });
    
    // Check specific relationship details
    const deployedByRel = relationships.find(r => r.relationName === 'deployedBy');
    expect(deployedByRel?.targetTypes).toContain('core:Organization');
    expect(deployedByRel?.isReverse).toBe(false);
    
    const reportsRel = relationships.find(r => r.relationName === 'reports');
    expect(reportsRel?.targetTypes).toContain('aiid:Report');
    expect(reportsRel?.isReverse).toBe(false);
  });

  it('should discover reverse relationships', () => {
    const relationships = discoverRelationships(normalizedData, 'aiid:Report');
    
    const reverseReportsRel = relationships.find(r => r.relationName === 'reverse_reports');
    expect(reverseReportsRel).toBeTruthy();
    expect(reverseReportsRel?.isReverse).toBe(true);
    expect(reverseReportsRel?.targetTypes).toContain('aiid:Incident');
    expect(reverseReportsRel?.label).toContain('←');
  });

  it('should format relationship labels correctly', () => {
    expect(formatRelationshipLabel('deployedBy')).toBe('Deployed by');
    expect(formatRelationshipLabel('reverse_authors')).toBe('← authors');
    expect(formatRelationshipLabel('affectedParties')).toBe('Affected parties');
  });

  it('should discover relationship paths', () => {
    const paths = discoverRelationshipPaths(normalizedData, 'aiid:Incident', 2);
    
    expect(paths.length).toBeGreaterThan(0);
    
    // Should find viable paths
    const viablePaths = paths.filter(p => p.viable);
    expect(viablePaths.length).toBeGreaterThan(0);
    
    // Check path structure
    paths.forEach(path => {
      expect(path.path.length).toBeGreaterThanOrEqual(3); // source + relation + target minimum
      expect(path.path[0]).toBe('aiid:Incident'); // Should start with source type
      expect(path.label).toBeTruthy();
      expect(typeof path.viable).toBe('boolean');
    });
    
    // Should find incident -> reports -> authors path
    const incidentReportsAuthorsPath = paths.find(p => 
      p.path.includes('reports') && p.path.includes('core:Person')
    );
    expect(incidentReportsAuthorsPath).toBeTruthy();
  });

  it('should get compatible target types', () => {
    // Test direct field grouping (no relationship)
    const sameTypes = getCompatibleTargetTypes(normalizedData, 'aiid:Incident');
    expect(sameTypes).toEqual(['aiid:Incident']);
    
    // Test specific relationship
    const deployedByTargets = getCompatibleTargetTypes(normalizedData, 'aiid:Incident', 'deployedBy');
    expect(deployedByTargets).toContain('core:Organization');
    
    const reportsTargets = getCompatibleTargetTypes(normalizedData, 'aiid:Incident', 'reports');
    expect(reportsTargets).toContain('aiid:Report');
    
    // Test non-existent relationship
    const nonExistentTargets = getCompatibleTargetTypes(normalizedData, 'aiid:Incident', 'nonExistentRelation');
    expect(nonExistentTargets).toEqual([]);
  });

  it('should handle empty or invalid data gracefully', () => {
    const emptyResult = { normalized: null, extracted: {} };
    
    expect(discoverEntityTypes(emptyResult)).toEqual([]);
    expect(discoverRelationships(emptyResult, 'NonExistentType')).toEqual([]);
    expect(analyzeEntityFields([])).toEqual([]);
    expect(discoverRelationshipPaths(emptyResult, 'NonExistentType')).toEqual([]);
  });

  it('should exclude reverse relationships from field analysis', () => {
    const reports = normalizedData.extracted['aiid:Report'];
    const fields = analyzeEntityFields(reports);
    
    // Should not include reverse relationships as fields
    const fieldNames = fields.map(f => f.fieldName);
    expect(fieldNames).not.toContain('reverse_reports');
    expect(fieldNames).not.toContain('reverse_authors');
    
    // But should include regular relationships
    expect(fieldNames).toContain('authors');
  });
});