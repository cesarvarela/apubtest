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

// Normalized entity interfaces
interface NormalizedEntity {
  id: string;
  type: string;
  properties: { [key: string]: any };
  relationships: { [relationName: string]: string[] };
  sourceData: any;
}

interface EntityCollection {
  entities: { [id: string]: NormalizedEntity };
  types: { [type: string]: string[] }; // Maps type to array of entity IDs
  relationships: { [relationName: string]: Array<{ source: string; target: string }> };
}

// Dynamic chart interfaces
interface SchemaProperty {
  key: string;
  label: string;
  uri: string;
  type: 'string' | 'date' | 'number' | 'object' | 'array';
  isRelation: boolean;
}

interface SchemaType {
  key: string;
  label: string;
  uri: string;
  properties: SchemaProperty[];
}

interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  xAxis: SchemaProperty | null;
  yAxis: SchemaProperty | null;
  groupBy: SchemaProperty | null;
  aggregation: 'count' | 'sum' | 'average';
  entityType: string | null; // Filter by entity type
  sortBy: 'count' | 'alphabetical';
  sortOrder: 'asc' | 'desc';
  topN: number | null; // null means show all
}

interface DynamicChartData {
  data: Array<{ [key: string]: any }>;
  xLabel: string;
  yLabel: string;
}


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

function extractDynamicDataFromEntities(entityCollection: EntityCollection, config: ChartConfig): DynamicChartData {
  if (!config.xAxis) {
    console.log('extractDynamicDataFromEntities - early return: no xAxis');
    return { data: [], xLabel: '', yLabel: '' };
  }

  console.log('extractDynamicDataFromEntities called with:', {
    totalEntities: Object.keys(entityCollection.entities).length,
    entityType: config.entityType,
    xAxisKey: config.xAxis.key,
    xAxisUri: config.xAxis.uri,
    yAxisKey: config.yAxis?.key,
    aggregation: config.aggregation
  });

  // Filter entities by type if specified
  let relevantEntities = Object.values(entityCollection.entities);
  if (config.entityType && config.entityType !== 'all') {
    relevantEntities = relevantEntities.filter(entity => entity.type === config.entityType);
  }

  console.log('Filtered entities:', relevantEntities.length, 'of type:', config.entityType);

  let results: { [key: string]: any }[] = [];

  if (!config.yAxis || config.aggregation === 'count') {
    // Count aggregation grouped by X-axis property
    const countMap = new Map<string, number>();

    relevantEntities.forEach(entity => {
      const xValue = extractEntityPropertyValue(entity, config.xAxis!, entityCollection);
      if (xValue !== null && xValue !== undefined) {
        let groupKey: string;

        if (config.xAxis!.isRelation && config.xAxis!.type === 'array') {
          // For relations, show the count or names
          if (typeof xValue === 'number') {
            groupKey = `${xValue} ${config.xAxis!.key}`;
          } else {
            groupKey = String(xValue);
          }
        } else if (config.xAxis!.type === 'date') {
          // Group dates by year
          const date = new Date(xValue);
          groupKey = date.getFullYear().toString();
        } else {
          groupKey = String(xValue);
        }

        countMap.set(groupKey, (countMap.get(groupKey) || 0) + 1);
      }
    });

    Array.from(countMap.entries()).forEach(([key, count]) => {
      results.push({
        [config.xAxis!.key]: key,
        count: count
      });
    });

    // Apply dynamic sorting
    results.sort((a, b) => {
      if (config.xAxis!.type === 'date') {
        // Always sort dates chronologically
        return parseInt(a[config.xAxis!.key]) - parseInt(b[config.xAxis!.key]);
      } else {
        let comparison = 0;

        if (config.sortBy === 'alphabetical') {
          // Sort alphabetically by the x-axis key
          comparison = a[config.xAxis!.key].localeCompare(b[config.xAxis!.key]);
        } else {
          // Sort by count (default)
          comparison = a.count - b.count;
        }

        // Apply sort order
        return config.sortOrder === 'desc' ? -comparison : comparison;
      }
    });

    // Apply dynamic top N filter
    if (config.xAxis!.type !== 'date' && config.topN && results.length > config.topN) {
      results = results.slice(0, config.topN);
    }

  } else {
    // Direct property extraction with both X and Y values
    const aggregationMap = new Map<string, number[]>();

    relevantEntities.forEach(entity => {
      const xValue = extractEntityPropertyValue(entity, config.xAxis!, entityCollection);
      const yValue = extractEntityPropertyValue(entity, config.yAxis!, entityCollection);

      if (xValue !== null && yValue !== null) {
        const xKey = String(xValue);
        if (!aggregationMap.has(xKey)) {
          aggregationMap.set(xKey, []);
        }
        aggregationMap.get(xKey)!.push(Number(yValue) || 0);
      }
    });

    Array.from(aggregationMap.entries()).forEach(([key, values]) => {
      let aggregatedValue: number;
      switch (config.aggregation) {
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'average':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        default:
          aggregatedValue = values.length;
      }

      results.push({
        [config.xAxis!.key]: key,
        [config.yAxis!.key]: aggregatedValue
      });
    });
  }

  return {
    data: results,
    xLabel: config.xAxis.label,
    yLabel: config.yAxis?.label || 'Count'
  };
}

function extractEntityPropertyValue(entity: NormalizedEntity, property: SchemaProperty, entityCollection: EntityCollection): any {
  // First check direct properties
  if (entity.properties[property.key] !== undefined) {
    const value = entity.properties[property.key];
    if (property.type === 'date' && value) {
      return value;
    }
    return value;
  }

  // Check relationships
  if (entity.relationships[property.key]) {
    const relatedIds = entity.relationships[property.key];

    if (property.isRelation && property.type === 'array') {
      // Return count for array relationships
      return relatedIds.length;
    } else if (property.isRelation) {
      // For single relationships, try to extract names
      const relatedEntities = relatedIds.map(id => entityCollection.entities[id]).filter(Boolean);
      if (relatedEntities.length > 0) {
        // Try to get names from related entities
        const names = relatedEntities.map(relatedEntity => {
          return relatedEntity.properties.name ||
            relatedEntity.properties.title ||
            relatedEntity.properties.incidentId ||
            relatedEntity.id.split('/').pop() ||
            'Unknown';
        });
        return names.join(', ');
      }
      return relatedIds.length;
    }
  }

  // Check expanded URI in the source data
  const expandedValue = entity.sourceData[property.uri];
  if (expandedValue !== undefined) {
    if (Array.isArray(expandedValue)) {
      if (property.isRelation && expandedValue.length > 0) {
        if (property.key === 'deployedBy' || property.uri.includes('deployedBy')) {
          // For deployedBy, extract organization names
          const names: string[] = [];
          expandedValue.forEach((org: any) => {
            if (org && typeof org === 'object') {
              const nameProperty = org['https://schema.org/name'];
              if (nameProperty && Array.isArray(nameProperty) && nameProperty.length > 0 && nameProperty[0]) {
                names.push(nameProperty[0]['@value'] || 'Unnamed');
              }
            }
          });
          return names.length > 0 ? names.join(', ') : 'Unknown Organization';
        } else if (property.key === 'reports' || property.uri.includes('reports')) {
          // For reports, return count
          return expandedValue.length;
        } else if (property.key === 'authors' || property.uri.includes('authors')) {
          // For authors, extract names or return count
          const names: string[] = [];
          expandedValue.forEach((author: any) => {
            if (author && typeof author === 'object') {
              const nameProperty = author['https://schema.org/name'];
              if (nameProperty && Array.isArray(nameProperty) && nameProperty.length > 0 && nameProperty[0]) {
                names.push(nameProperty[0]['@value'] || 'Unnamed');
              }
            }
          });
          return names.length > 0 ? names.join(', ') : expandedValue.length;
        } else {
          // General relation handling
          if (property.type === 'array') {
            return expandedValue.length; // Return count for arrays
          } else if (expandedValue.length > 0 && expandedValue[0]) {
            // Try to extract name from first related object
            const nameProperty = expandedValue[0]['https://schema.org/name'];
            if (nameProperty && Array.isArray(nameProperty) && nameProperty.length > 0) {
              return nameProperty[0]['@value'];
            }
            return expandedValue[0]['@id'] || 'Unknown';
          } else {
            return 'No data';
          }
        }
      } else {
        // For simple values
        if (expandedValue.length > 0 && expandedValue[0]) {
          return expandedValue[0]['@value'] || expandedValue[0];
        }
        return null;
      }
    } else if (expandedValue['@value'] !== undefined) {
      return expandedValue['@value'];
    }
    return expandedValue;
  }

  return null;
}


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

  // Dynamic chart configuration
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    chartType: 'bar',
    xAxis: null,
    yAxis: null,
    groupBy: null,
    aggregation: 'count',
    entityType: null,
    sortBy: 'count',
    sortOrder: 'desc',
    topN: 15
  });

  // Set default configuration when properties and entity types are available
  useEffect(() => {
    if (availableProperties.length > 0 && availableEntityTypes.length > 0 && !chartConfig.xAxis) {
      const deployedByProp = availableProperties.find(p => p.key === 'deployedBy');
      const defaultEntityType = availableEntityTypes.find(t => t.key.includes('Incident')) || availableEntityTypes[0];

      if (deployedByProp && defaultEntityType) {
        setChartConfig(prev => ({
          ...prev,
          xAxis: deployedByProp,
          groupBy: deployedByProp,
          yAxis: null,
          aggregation: 'count',
          entityType: defaultEntityType.key,
          sortBy: 'count',
          sortOrder: 'desc',
          topN: 15
        }));
      }
    }
  }, [availableProperties, availableEntityTypes, chartConfig.xAxis]);

  // Process data for charts using expanded JSON-LD

  // Dynamic chart data using normalized entities
  const dynamicChartData = useMemo<DynamicChartData>(() => {
    if (!chartConfig.xAxis || Object.keys(normalizedEntities.entities).length === 0) {
      console.log('Dynamic chart data - missing requirements:', {
        hasXAxis: !!chartConfig.xAxis,
        entitiesCount: Object.keys(normalizedEntities.entities).length,
        chartConfig
      });
      return { data: [], xLabel: '', yLabel: '' };
    }

    console.log('Extracting dynamic data with normalized entities:', {
      config: chartConfig,
      totalEntities: Object.keys(normalizedEntities.entities).length,
      entityTypes: Object.keys(normalizedEntities.types)
    });

    const result = extractDynamicDataFromEntities(normalizedEntities, chartConfig);
    console.log('Dynamic chart data result:', result);

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

        {/* Prebuilt Examples */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold mb-4">Prebuilt Examples</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const deployedBy = availableProperties.find(p => p.key === 'deployedBy');
                const incidentType = availableEntityTypes.find(t => t.key.includes('Incident'));
                if (deployedBy) {
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: deployedBy,
                    groupBy: deployedBy,
                    yAxis: null,
                    aggregation: 'count',
                    chartType: 'bar',
                    entityType: incidentType?.key || null,
                    sortBy: 'count',
                    sortOrder: 'desc',
                    topN: 15
                  }));
                }
              }}
              className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              Organizations vs Incidents
            </button>
            <button
              onClick={() => {
                const date = availableProperties.find(p => p.key === 'date');
                const incidentType = availableEntityTypes.find(t => t.key.includes('Incident'));
                if (date) {
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: date,
                    groupBy: date,
                    yAxis: null,
                    aggregation: 'count',
                    chartType: 'line',
                    entityType: incidentType?.key || null,
                    sortBy: 'count',
                    sortOrder: 'desc',
                    topN: null
                  }));
                }
              }}
              className="px-4 py-2 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              Timeline
            </button>
            <button
              onClick={() => {
                const reports = availableProperties.find(p => p.key === 'reports');
                const incidentType = availableEntityTypes.find(t => t.key.includes('Incident'));
                if (reports) {
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: reports,
                    groupBy: reports,
                    yAxis: null,
                    aggregation: 'count',
                    chartType: 'pie',
                    entityType: incidentType?.key || null,
                    sortBy: 'count',
                    sortOrder: 'desc',
                    topN: 10
                  }));
                }
              }}
              className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              Reports Distribution
            </button>
            <button
              onClick={() => {
                const affectedParties = availableProperties.find(p => p.key === 'affectedParties');
                const incidentType = availableEntityTypes.find(t => t.key.includes('Incident'));
                if (affectedParties) {
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: affectedParties,
                    groupBy: affectedParties,
                    yAxis: null,
                    aggregation: 'count',
                    chartType: 'bar',
                    entityType: incidentType?.key || null,
                    sortBy: 'count',
                    sortOrder: 'desc',
                    topN: 20
                  }));
                }
              }}
              className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              Harmed Parties
            </button>
            <button
              onClick={() => {
                const affectedParties = availableProperties.find(p => p.key === 'affectedParties');
                const incidentType = availableEntityTypes.find(t => t.key.includes('Incident'));
                if (affectedParties) {
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: affectedParties,
                    groupBy: affectedParties,
                    yAxis: null,
                    aggregation: 'count',
                    chartType: 'pie',
                    entityType: incidentType?.key || null,
                    sortBy: 'count',
                    sortOrder: 'desc',
                    topN: 10
                  }));
                }
              }}
              className="px-4 py-2 text-sm bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
            >
              Affected Groups Count
            </button>
          </div>
        </div>

        {/* Chart Configuration Panel */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold mb-4">Chart Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Row 1: Main Configuration */}
            <div>
              <Label htmlFor="entity-type" className="text-sm font-medium mb-2 block">
                Entity Type
              </Label>
              <Select
                value={chartConfig.entityType || 'all'}
                onValueChange={(value) =>
                  setChartConfig(prev => ({ ...prev, entityType: value === 'all' ? null : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types ({Object.keys(normalizedEntities.entities).length})</SelectItem>
                  {availableEntityTypes.map(entityType => (
                    <SelectItem key={entityType.key} value={entityType.key}>
                      {entityType.label} ({entityType.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div>
              <Label htmlFor="x-axis" className="text-sm font-medium mb-2 block">
                X-Axis (Categories)
              </Label>
              <Select
                value={chartConfig.xAxis?.key || ''}
                onValueChange={(value) => {
                  const property = availableProperties.find(p => p.key === value);
                  setChartConfig(prev => ({
                    ...prev,
                    xAxis: property || null,
                    groupBy: property || prev.groupBy // Also set as groupBy for aggregation
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select X-axis property" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map(prop => (
                    <SelectItem key={prop.key} value={prop.key}>
                      {prop.label} ({prop.type}{prop.isRelation ? ', relation' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="y-axis" className="text-sm font-medium mb-2 block">
                Y-Axis (Values)
              </Label>
              <Select
                value={chartConfig.yAxis?.key || 'count'}
                onValueChange={(value) => {
                  if (value === 'count') {
                    setChartConfig(prev => ({
                      ...prev,
                      yAxis: null,
                      aggregation: 'count'
                    }));
                  } else {
                    const property = availableProperties.find(p => p.key === value);
                    setChartConfig(prev => ({
                      ...prev,
                      yAxis: property || null,
                      aggregation: property?.type === 'number' ? 'sum' : 'count'
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Y-axis property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count of Items</SelectItem>
                  {availableProperties.filter(prop => prop.type === 'number' || prop.isRelation).map(prop => (
                    <SelectItem key={prop.key} value={prop.key}>
                      {prop.label} ({prop.type}{prop.isRelation ? ' count' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aggregation" className="text-sm font-medium mb-2 block">
                Aggregation
              </Label>
              <Select
                value={chartConfig.aggregation}
                onValueChange={(value: 'count' | 'sum' | 'average') =>
                  setChartConfig(prev => ({ ...prev, aggregation: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aggregation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Sorting and Filtering Options */}
            <div>
              <Label htmlFor="sort-by" className="text-sm font-medium mb-2 block">
                Sort By
              </Label>
              <Select
                value={chartConfig.sortBy}
                onValueChange={(value: 'count' | 'alphabetical') =>
                  setChartConfig(prev => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count (Value)</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
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
                    topN: value === 'all' ? null : parseInt(value)
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
            {chartConfig.entityType && ` • Entity: ${availableEntityTypes.find(t => t.key === chartConfig.entityType)?.label || chartConfig.entityType}`}
            {chartConfig.xAxis && ` • X: ${chartConfig.xAxis.label}`}
            {chartConfig.yAxis && ` • Y: ${chartConfig.yAxis.label}`}
            {chartConfig.aggregation && ` (${chartConfig.aggregation})`}
            <br />
            <strong>Data & Sorting:</strong> {dynamicChartData.data.length} points •
            Sort by {chartConfig.sortBy} ({chartConfig.sortOrder}) •
            Show {chartConfig.topN ? `top ${chartConfig.topN}` : 'all'}
            <br />
            <strong>Entity Filter:</strong> {chartConfig.entityType || 'All'} |
            <strong>X-Axis:</strong> {chartConfig.xAxis?.key || 'None'} |
            <strong>Y-Axis:</strong> {chartConfig.yAxis?.key || 'Count'}
            <br />
            <strong>Total Entities:</strong> {Object.keys(normalizedEntities.entities).length} |
            <strong>Entity Types:</strong> {availableEntityTypes.map(t => `${t.label}(${t.count})`).join(', ')}
            <br />
            <strong>Available Properties:</strong> {availableProperties.map(p => p.key).join(', ')}
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

          <AccordionItem value="dynamic-chart-data">
            <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
              Chart Data
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