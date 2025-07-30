'use client';

import { useState, useMemo, useEffect } from 'react';
import { useJsonLdExpansion } from '@/hooks/useJsonLdExpansion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import DynamicChart from '@/components/charts/DynamicChart';
import { ChartConfig, ChartData, EntityCollection, NormalizedEntity, SchemaProperty } from '@/types/charts';
import { extractChartData } from '@/lib/charts/measureDimensionExtractor';
import { chartTemplates } from '@/lib/charts/chartTemplates';
import { extractAvailableFields, extractAvailableRelationships, getCompatibleDimensionEntities, formatFieldLabel, FieldInfo, RelationshipInfo } from '@/lib/charts/fieldExtractor';

import aiidFullPayload from '@/data/aiid-converted.json';

const coreContext = {
  "@context": {
    "@protected": true,
    "core": "https://example.org/core#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "Incident": {
      "@id": "core:Incident",
      "@type": "@id"
    },
    "incidentId": {
      "@id": "core:incidentId",
      "@type": "xsd:string"
    },
    "title": {
      "@id": "core:title",
      "@type": "xsd:string"
    },
    "name": {
      "@id": "schema:name",
      "@type": "xsd:string"
    },
    "Organization": {
      "@id": "core:Organization",
      "@type": "@id"
    },
    "Person": "core:Person",
    "email": {
      "@id": "schema:email",
      "@type": "xsd:string"
    }
  }
}

const localContext = {
  "@context": {
    "@protected": true,
    "aiid": "https://example.org/aiid#",
    "core": "https://example.org/core#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "ui": "https://example.org/ui#",
    "aiid:Incident": {
      "@id": "aiid:Incident",
      "@type": "@id"
    },
    "deployedBy": {
      "@id": "aiid:deployedBy",
      "@type": "@id",
      "@container": "@set"
    },
    "reports": {
      "@id": "aiid:reports",
      "@type": "@id",
      "@container": "@set"
    },
    "authors": {
      "@id": "aiid:authors",
      "@type": "@id",
      "@container": "@set"
    },
    "affectedParties": {
      "@id": "aiid:affectedParties",
      "@type": "@id",
      "@container": "@set"
    },
    "Report": {
      "@id": "aiid:Report",
      "@type": "@id"
    },
    "date": {
      "@id": "aiid:date",
      "@type": "xsd:date"
    },
    "ui:title": {
      "@id": "ui:title",
      "@type": "@json",
    },
    "ui:incidentId": {
      "@id": "ui:incidentId",
      "@type": "@json"
    },
    "ui:deployedBy": {
      "@id": "ui:deployedBy",
      "@type": "@json"
    },
    "ui:reports": {
      "@id": "ui:reports",
      "@type": "@json"
    },
    "ui:affectedParties": {
      "@id": "ui:affectedParties",
      "@type": "@json"
    }
  }
}

// Import types from centralized location - interfaces now defined in types/charts.ts


// Functions to analyze JSON-LD context and extract schema information
function analyzeContext(coreContext: any, localContext: any): SchemaProperty[] {
  const properties: SchemaProperty[] = [];

  // Combine contexts
  const allContexts = {
    ...coreContext['@context'],
    ...localContext['@context']
  };

  // Extract properties from context
  Object.entries(allContexts).forEach(([key, value]: [string, any]) => {
    if (key.startsWith('@') || key.startsWith('ui:')) return; // Skip special keys

    if (typeof value === 'string') {
      // Simple property mapping - expand prefixed URIs
      let fullUri = value;
      if (value.includes(':') && !value.startsWith('http')) {
        const [prefix, localName] = value.split(':');
        const baseUri = allContexts[prefix];
        if (typeof baseUri === 'string') {
          fullUri = baseUri + localName;
        } else if (typeof baseUri === 'object' && baseUri['@id']) {
          fullUri = baseUri['@id'] + localName;
        }
      }

      properties.push({
        key,
        label: formatLabel(key),
        uri: fullUri,
        type: inferType(key, value),
        isRelation: false
      });
    } else if (typeof value === 'object' && value['@id']) {
      // Complex property with @id - expand prefixed URIs
      let fullUri = value['@id'];
      if (fullUri.includes(':') && !fullUri.startsWith('http')) {
        const [prefix, localName] = fullUri.split(':');
        const baseUri = allContexts[prefix];
        if (typeof baseUri === 'string') {
          fullUri = baseUri + localName;
        } else if (typeof baseUri === 'object' && baseUri['@id']) {
          fullUri = baseUri['@id'] + localName;
        }
      }

      const isRelation = value['@type'] === '@id' || value['@container'] === '@set';
      properties.push({
        key,
        label: formatLabel(key),
        uri: fullUri,
        type: inferType(key, value),
        isRelation
      });
    }
  });

  return properties;
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function inferType(key: string, value: any): 'string' | 'date' | 'number' | 'object' | 'array' {
  if (typeof value === 'object' && value['@type']) {
    if (value['@type'] === 'xsd:date') return 'date';
    if (value['@type'] === 'xsd:string') return 'string';
    if (value['@type'] === '@id') return 'object';
    if (value['@container'] === '@set') return 'array';
  }

  // Heuristics based on key name
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) return 'date';
  if (key.toLowerCase().includes('count') || key.toLowerCase().includes('number')) return 'number';
  if (key.toLowerCase().includes('by') || key.toLowerCase().includes('reports') || key.toLowerCase().includes('authors')) return 'array';

  return 'string';
}

// Entity normalization functions
function normalizeEntities(expandedData: any[]): EntityCollection {
  const collection: EntityCollection = {
    entities: {},
    types: {},
    relationships: {}
  };

  if (!expandedData || !Array.isArray(expandedData)) {
    return collection;
  }

  const visited = new Set<string>();

  function extractEntity(data: any, parentId?: string, relationName?: string): void {
    if (!data || typeof data !== 'object') return;

    const id = data['@id'];
    if (!id) return;

    // Skip if already processed
    if (visited.has(id)) {
      // Still record relationship if this is a reference
      if (parentId && relationName) {
        if (!collection.relationships[relationName]) {
          collection.relationships[relationName] = [];
        }
        collection.relationships[relationName].push({ source: parentId, target: id });
      }
      return;
    }

    visited.add(id);

    // Extract type information
    const typeValue = data['@type'];
    if (!typeValue) return;

    let type = Array.isArray(typeValue) ? typeValue[0] : typeValue;

    // Convert expanded URI form to compact form
    if (type.includes('#')) {
      const parts = type.split('#');
      const namespace = parts[0].includes('aiid') ? 'aiid' : 'core';
      type = `${namespace}:${parts[1]}`;
    } else if (type.includes('/')) {
      const parts = type.split('/');
      const typeName = parts.pop() || type;
      if (type.includes('aiid')) {
        type = `aiid:${typeName}`;
      } else if (type.includes('core')) {
        type = `core:${typeName}`;
      } else {
        type = typeName;
      }
    }

    // Extract properties and relationships
    const properties: { [key: string]: any } = {};
    const relationships: { [relationName: string]: string[] } = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('@') || key.startsWith('ui:')) return;

      if (Array.isArray(value)) {
        const relatedIds: string[] = [];
        value.forEach((item: any) => {
          if (item && typeof item === 'object' && item['@id']) {
            relatedIds.push(item['@id']);
            extractEntity(item, id, key);
          } else if (item && item['@value'] !== undefined) {
            // Literal value in array
            if (!properties[key]) properties[key] = [];
            properties[key].push(item['@value']);
          }
        });

        if (relatedIds.length > 0) {
          relationships[key] = relatedIds;
          // Record global relationships
          if (!collection.relationships[key]) {
            collection.relationships[key] = [];
          }
          relatedIds.forEach(targetId => {
            collection.relationships[key].push({ source: id, target: targetId });
          });
        }
      } else if (value && typeof value === 'object') {
        const valueObj = value as any;
        if (valueObj['@id']) {
          // Single relationship
          relationships[key] = [valueObj['@id']];
          if (!collection.relationships[key]) {
            collection.relationships[key] = [];
          }
          collection.relationships[key].push({ source: id, target: valueObj['@id'] });
          extractEntity(valueObj, id, key);
        } else if (valueObj['@value'] !== undefined) {
          // Literal value
          properties[key] = valueObj['@value'];
        }
      }
    });

    // Create normalized entity
    const entity: NormalizedEntity = {
      id,
      type,
      properties,
      relationships,
      sourceData: data
    };

    collection.entities[id] = entity;

    // Update type mapping
    if (!collection.types[type]) {
      collection.types[type] = [];
    }
    collection.types[type].push(id);

    // Record parent relationship if this entity was found through navigation
    if (parentId && relationName) {
      if (!collection.relationships[relationName]) {
        collection.relationships[relationName] = [];
      }
      collection.relationships[relationName].push({ source: parentId, target: id });
    }
  }

  // Extract all entities
  expandedData.forEach(item => extractEntity(item));

  // Create reverse relationships algorithmically
  Object.values(collection.entities).forEach(entity => {
    Object.entries(entity.relationships).forEach(([relationName, targetIds]) => {
      // Create reverse relationships with multiple key formats to match all possible lookups
      const reverseRelationNames = [
        `_reverse_${relationName}`, // _reverse_aiid:reports
        `_reverse_${relationName.split(':').pop() || relationName}`, // _reverse_reports
        `_reverse_${relationName.replace(/^https?:\/\/[^#]*#/, '')}`, // _reverse_reports (from URI)
      ];
      
      targetIds.forEach(targetId => {
        const targetEntity = collection.entities[targetId];
        if (targetEntity) {
          reverseRelationNames.forEach(reverseRelationName => {
            if (!targetEntity.relationships[reverseRelationName]) {
              targetEntity.relationships[reverseRelationName] = [];
            }
            if (!targetEntity.relationships[reverseRelationName].includes(entity.id)) {
              targetEntity.relationships[reverseRelationName].push(entity.id);
            }
          });
        }
      });
    });
  });

  console.log('Normalized entities:', {
    totalEntities: Object.keys(collection.entities).length,
    types: Object.keys(collection.types).map(type => ({
      type,
      count: collection.types[type].length
    })),
    relationships: Object.keys(collection.relationships).map(rel => ({
      relationship: rel,
      count: collection.relationships[rel].length
    }))
  });

  return collection;
}

// Old data extraction functions removed - now using extractChartData from lib/charts/chartDataExtractor.ts


export default function ChartsPage() {
  const [payload] = useState(aiidFullPayload);

  const { expandedData, loading, error } = useJsonLdExpansion({
    payload,
    coreContext,
    localContext
  });

  // Normalize entities from expanded data
  const normalizedEntities = useMemo<EntityCollection>(() => {
    if (!expandedData || !Array.isArray(expandedData)) {
      return { entities: {}, types: {}, relationships: {} };
    }
    return normalizeEntities(expandedData);
  }, [expandedData]);

  // Analyze available properties from context
  const availableProperties = useMemo(() => {
    return analyzeContext(coreContext, localContext);
  }, []);

  // Available entity types from normalized data
  const availableEntityTypes = useMemo(() => {
    return Object.keys(normalizedEntities.types).map(type => ({
      key: type,
      label: formatLabel(type.split(':')[1] || type),
      count: normalizedEntities.types[type].length
    }));
  }, [normalizedEntities]);

  // Dynamic chart configuration with new measure/dimension model
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    chartType: 'bar',
    measure: {
      entity: 'aiid:Incident',
      aggregation: 'count'
    },
    dimension: {
      entity: 'core:Organization',
      field: 'name',
      via: 'deployedBy'
    },
    sortBy: 'measure',
    sortOrder: 'desc',
    topN: 15
  });

  // Cascading update functions for form dependencies
  const handleMeasureEntityChange = (newMeasureEntity: string) => {
    setChartConfig(prev => ({
      ...prev,
      measure: { ...prev.measure, entity: newMeasureEntity },
      // Reset dependent fields
      dimension: {
        entity: prev.dimension.entity, // Keep if compatible, will be validated below
        field: 'name', // Reset to default
        via: undefined // Reset relationship
      }
    }));
  };

  const handleDimensionEntityChange = (newDimensionEntity: string) => {
    // Get available fields for the new entity
    const newFields = extractAvailableFields(normalizedEntities, newDimensionEntity);
    const defaultField = newFields.find(f => f.key === 'name') || 
                        newFields.find(f => f.key === 'title') || 
                        newFields[0];

    setChartConfig(prev => ({
      ...prev,
      dimension: {
        ...prev.dimension,
        entity: newDimensionEntity,
        field: defaultField?.key || 'name'
      }
    }));
  };

  const handleRelationshipChange = (newRelationship: string | undefined) => {
    // Get compatible dimension entities for this relationship
    const compatible = getCompatibleDimensionEntities(
      normalizedEntities, 
      chartConfig.measure.entity, 
      newRelationship
    );

    // If current dimension entity is not compatible, pick the first compatible one
    let newDimensionEntity = chartConfig.dimension.entity;
    if (!compatible.includes(newDimensionEntity) && compatible.length > 0) {
      newDimensionEntity = compatible[0];
    }

    // Get fields for the (possibly new) dimension entity
    const newFields = extractAvailableFields(normalizedEntities, newDimensionEntity);
    const defaultField = newFields.find(f => f.key === 'name') || 
                        newFields.find(f => f.key === 'title') || 
                        newFields[0];

    setChartConfig(prev => ({
      ...prev,
      dimension: {
        entity: newDimensionEntity,
        field: defaultField?.key || 'name',
        via: newRelationship === 'none' ? undefined : newRelationship
      }
    }));
  };

  // Dynamic field extraction based on current selections
  const availableFields = useMemo(() => {
    if (!chartConfig.dimension.entity) return [];
    
    // Use dynamic field extraction
    const fields = extractAvailableFields(normalizedEntities, chartConfig.dimension.entity);
    
    // If no fields found, create fallback based on current configuration
    if (fields.length === 0 && chartConfig.dimension.field) {
      return [{
        key: chartConfig.dimension.field,
        label: formatFieldLabel(chartConfig.dimension.field),
        type: 'string' as const,
        frequency: 1,
        totalCount: 1,
        entityCount: 1,
        isCommon: true
      }];
    }
    
    return fields;
  }, [normalizedEntities, chartConfig.dimension.entity, chartConfig.dimension.field]);
  

  const availableRelationships = useMemo(() => {
    if (!chartConfig.measure.entity) return [];
    const relationships = extractAvailableRelationships(normalizedEntities, chartConfig.measure.entity);
    
    // If no relationships are found but we have a current via relationship, create a fallback
    if (relationships.length === 0 && chartConfig.dimension.via) {
      return [{
        key: chartConfig.dimension.via,
        label: chartConfig.dimension.via,
        targetEntityTypes: chartConfig.dimension.entity ? [chartConfig.dimension.entity] : [],
        frequency: 1,
        totalCount: 1
      }];
    }
    
    return relationships;
  }, [normalizedEntities, chartConfig.measure.entity, chartConfig.dimension.via, chartConfig.dimension.entity]);

  const compatibleDimensionEntities = useMemo(() => {
    const compatible = getCompatibleDimensionEntities(
      normalizedEntities, 
      chartConfig.measure.entity, 
      chartConfig.dimension.via
    );
    
    const filtered = availableEntityTypes.filter(entityType => 
      compatible.includes(entityType.key)
    );
    
    // If no compatible entities found but we have a current dimension entity, include it
    if (filtered.length === 0 && chartConfig.dimension.entity) {
      const currentEntity = availableEntityTypes.find(et => et.key === chartConfig.dimension.entity);
      if (currentEntity) {
        return [currentEntity];
      }
    }
    
    return filtered;
  }, [normalizedEntities, chartConfig.measure.entity, chartConfig.dimension.via, availableEntityTypes, chartConfig.dimension.entity]);

  // Process data for charts using expanded JSON-LD

  // Dynamic chart data using new measure/dimension model
  const dynamicChartData = useMemo<ChartData>(() => {
    if (Object.keys(normalizedEntities.entities).length === 0) {
      console.log('Dynamic chart data - no entities available');
      return { data: [], measureLabel: '', dimensionLabel: '' };
    }

    console.log('Extracting chart data with new measure/dimension model:', {
      config: chartConfig,
      totalEntities: Object.keys(normalizedEntities.entities).length,
      entityTypes: Object.keys(normalizedEntities.types)
    });

    const result = extractChartData(normalizedEntities, chartConfig);
    console.log('Chart data result:', result);

    return result;
  }, [normalizedEntities, chartConfig]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Expanding JSON-LD...</div>
          <div className="text-sm text-gray-600">Processing semantic data for chart visualization</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">JSON-LD Expansion Error</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Link
              href="/demos"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Demos
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Charts Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive chart visualizations of AIID incident data using Observable Plot
          </p>
        </div>

        {/* Info */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Configure interactive charts • Data from {Object.keys(normalizedEntities.entities).length} entities ({availableEntityTypes.map(t => `${t.count} ${t.label}`).join(', ')})
          </div>
        </div>

        {/* Chart Templates */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold mb-4">Chart Templates</h3>
          <div className="flex flex-wrap gap-2">
            {chartTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setChartConfig(template.config)}
                className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
                title={template.description}
              >
                <span>{template.icon}</span>
                {template.title}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Configuration Panel */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold mb-4">Chart Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Chart Type */}
            <div>
              <Label htmlFor="chart-type" className="text-sm font-medium mb-2 block">
                Chart Type
              </Label>
              <Select
                value={chartConfig.chartType}
                onValueChange={(value: 'bar' | 'line' | 'pie' | 'scatter') =>
                  setChartConfig(prev => ({ ...prev, chartType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Measure Entity */}
            <div>
              <Label htmlFor="measure-entity" className="text-sm font-medium mb-2 block">
                What to Measure
              </Label>
              <Select
                value={chartConfig.measure.entity}
                onValueChange={handleMeasureEntityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity to measure" />
                </SelectTrigger>
                <SelectContent>
                  {availableEntityTypes.map(entityType => (
                    <SelectItem key={entityType.key} value={entityType.key}>
                      {entityType.label} ({entityType.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Measure Aggregation */}
            <div>
              <Label htmlFor="measure-aggregation" className="text-sm font-medium mb-2 block">
                How to Measure
              </Label>
              <Select
                value={chartConfig.measure.aggregation}
                onValueChange={(value: 'count' | 'sum' | 'avg') =>
                  setChartConfig(prev => ({
                    ...prev,
                    measure: { ...prev.measure, aggregation: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aggregation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dimension Entity */}
            <div>
              <Label htmlFor="dimension-entity" className="text-sm font-medium mb-2 block">
                Group By Entity
              </Label>
              <Select
                value={chartConfig.dimension.entity}
                onValueChange={handleDimensionEntityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grouping entity" />
                </SelectTrigger>
                <SelectContent>
                  {compatibleDimensionEntities.map(entityType => (
                    <SelectItem key={entityType.key} value={entityType.key}>
                      {entityType.label} ({entityType.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dimension Field */}
            <div>
              <Label htmlFor="dimension-field" className="text-sm font-medium mb-2 block">
                Group By Field
              </Label>
              <Select
                value={chartConfig.dimension.field}
                onValueChange={(value) =>
                  setChartConfig(prev => ({
                    ...prev,
                    dimension: { ...prev.dimension, field: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select display field" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map(field => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label} 
                      {field.type !== 'string' && ` (${field.type})`}
                      {!field.isCommon && ` (${Math.round(field.frequency * 100)}%)`}
                    </SelectItem>
                  ))}
                  {availableFields.length === 0 && (
                    <SelectItem value="name" disabled>No fields available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Relationship Path */}
            <div>
              <Label htmlFor="dimension-via" className="text-sm font-medium mb-2 block">
                Relationship (Via)
              </Label>
              <Select
                value={(() => {
                  if (!chartConfig.dimension.via) return 'none';
                  
                  // First try exact match
                  const exactMatch = availableRelationships.find(rel => rel.key === chartConfig.dimension.via);
                  if (exactMatch) return exactMatch.key;
                  
                  // Then try compact key mapping (deployedBy -> https://example.org/aiid#deployedBy)
                  const compactMatch = availableRelationships.find(rel => {
                    const compactKey = rel.key.includes('#') 
                      ? rel.key.split('#').pop() 
                      : rel.key.includes(':') && !rel.key.includes('://') 
                        ? rel.key.split(':').pop()
                        : rel.key;
                    return compactKey === chartConfig.dimension.via;
                  });
                  
                  return compactMatch ? compactMatch.key : 'none';
                })()}
                onValueChange={(value) => handleRelationshipChange(value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (same entity)</SelectItem>
                  {availableRelationships.map(rel => (
                    <SelectItem key={rel.key} value={rel.key}>
                      {rel.label}
                      {rel.frequency < 1 && ` (${Math.round(rel.frequency * 100)}%)`}
                      {rel.targetEntityTypes.length > 0 && ` → ${rel.targetEntityTypes.map(t => t.split(':')[1] || t).join(', ')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div>
              <Label htmlFor="sort-by" className="text-sm font-medium mb-2 block">
                Sort By
              </Label>
              <Select
                value={chartConfig.sortBy}
                onValueChange={(value: 'measure' | 'dimension') =>
                  setChartConfig(prev => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="measure">By Value</SelectItem>
                  <SelectItem value="dimension">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-order" className="text-sm font-medium mb-2 block">
                Sort Order
              </Label>
              <Select
                value={chartConfig.sortOrder}
                onValueChange={(value: 'asc' | 'desc') =>
                  setChartConfig(prev => ({ ...prev, sortOrder: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending (High to Low)</SelectItem>
                  <SelectItem value="asc">Ascending (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="top-n" className="text-sm font-medium mb-2 block">
                Show Top
              </Label>
              <Select
                value={chartConfig.topN?.toString() || 'all'}
                onValueChange={(value) =>
                  setChartConfig(prev => ({
                    ...prev,
                    topN: value === 'all' ? undefined : parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number to show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="15">Top 15</SelectItem>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="all">Show All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chart Visualization
          </h2>
          <DynamicChart data={dynamicChartData} config={chartConfig} />

          {/* Configuration Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-zinc-900 rounded text-sm">
            <strong>Configuration:</strong> {chartConfig.chartType} chart
            <br />
            <strong>Measure:</strong> {chartConfig.measure.aggregation} of {chartConfig.measure.entity} 
            <br />
            <strong>Dimension:</strong> {chartConfig.dimension.entity} ({chartConfig.dimension.field})
            {chartConfig.dimension.via && ` via ${chartConfig.dimension.via}`}
            <br />
            <strong>Data & Sorting:</strong> {dynamicChartData.data.length} points •
            Sort by {chartConfig.sortBy} ({chartConfig.sortOrder}) •
            Show {chartConfig.topN ? `top ${chartConfig.topN}` : 'all'}
            <br />
            <strong>Total Entities:</strong> {Object.keys(normalizedEntities.entities).length} |
            <strong>Entity Types:</strong> {availableEntityTypes.map(t => `${t.label}(${t.count})`).join(', ')}
          </div>
        </div>
      </div>

      {/* Raw Data Display */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="normalized-entities">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Normalized Entities ({Object.keys(normalizedEntities.entities).length})
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(normalizedEntities, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="chart-data">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Chart Data ({dynamicChartData.data.length} points)
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(dynamicChartData, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="available-properties">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Available Properties ({availableProperties.length})
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(availableProperties, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="expanded-data">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Expanded JSON-LD Data
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(expandedData, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="expanded-payload">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Expanded JSON-LD Payload
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(expandedData, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="original-payload">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Original Payload
            </AccordionTrigger>
            <AccordionContent className="px-6">
              <pre className="text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </main>
  );
}