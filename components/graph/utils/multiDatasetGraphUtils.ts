import { NormalizationResult } from '@/lib/normalization';

export interface MultiDatasetGraphNode {
  id: string;
  label: string;
  type: string;
  value?: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  degree?: number;
  radius?: number;
  dataset: string; // Which dataset this node originated from
  datasets?: string[]; // All datasets this entity appears in (for merged nodes)
  connectionCount?: number; // Number of connections this node has
}

export interface MultiDatasetGraphEdge {
  source: string | MultiDatasetGraphNode;
  target: string | MultiDatasetGraphNode;
  label: string;
  type: string;
  dataset: string; // Which dataset this edge originated from
}

export interface DatasetConfig {
  id: string;
  name: string;
  color: string;
  data: NormalizationResult;
}

// Configuration for multi-dataset graph
export const MULTI_DATASET_CONFIG = {
  maxIncidentsPerDataset: 15, // Limit incidents per dataset
  maxDepth: 2, // Maximum depth to follow relationships (0 = incidents only)
  maxTotalNodes: 200, // Maximum total nodes to prevent performance issues
  
  // Dataset colors
  datasetColors: {
    aiid: '#ef4444',    // red
    oecd: '#3b82f6',    // blue
    ic3: '#10b981',     // green
    tesla: '#f59e0b',   // amber
  },
  
  // Node type colors (override dataset colors for certain types)
  typeColors: {
    'core:Organization': '#8b5cf6',  // purple
    'core:Person': '#ec4899',        // pink
    'core:Country': '#06b6d4',       // cyan
  },
  
  // Force simulation settings
  forces: {
    linkStrength: 0.5,      // Strength of links
    linkDistance: 50,       // Desired link distance
    chargeStrength: -300,   // Repulsion between nodes
    collisionRadius: 20,    // Collision detection radius
    centerStrength: 0.1,    // Pull toward center
  }
};

/**
 * Count the number of connections for each incident in a dataset
 */
function countIncidentConnections(normalizedData: NormalizationResult, incidentType: string): Map<string, number> {
  const connectionCounts = new Map<string, number>();
  
  // Find all incidents of the specified type
  const incidents = normalizedData.extracted[incidentType] || [];
  
  incidents.forEach(incident => {
    let count = 0;
    
    // Count all relationships (both direct properties and reverse relationships)
    Object.entries(incident).forEach(([key, value]) => {
      if (key.startsWith('@') || key.startsWith('ui:')) return;
      
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value && typeof value === 'object' && (value['@id'] || value.id)) {
        count += 1;
      }
    });
    
    connectionCounts.set(incident['@id'], count);
  });
  
  return connectionCounts;
}

/**
 * Get top incidents by connection count
 */
function getTopIncidents(
  normalizedData: NormalizationResult, 
  incidentType: string, 
  limit: number
): any[] {
  const incidents = normalizedData.extracted[incidentType] || [];
  const connectionCounts = countIncidentConnections(normalizedData, incidentType);
  
  // Sort incidents by connection count
  const sortedIncidents = [...incidents].sort((a, b) => {
    const countA = connectionCounts.get(a['@id']) || 0;
    const countB = connectionCounts.get(b['@id']) || 0;
    return countB - countA;
  });
  
  return sortedIncidents.slice(0, limit);
}

/**
 * Extract entities and relationships from an incident
 */
function extractIncidentGraph(
  incident: any,
  dataset: string,
  normalizedData: NormalizationResult,
  nodes: Map<string, MultiDatasetGraphNode>,
  edges: MultiDatasetGraphEdge[],
  visited: Set<string>,
  currentDepth: number = 0,
  maxDepth: number = Number.MAX_SAFE_INTEGER
) {
  if (!incident || !incident['@id']) return;
  
  const id = incident['@id'];
  const type = incident['@type'];
  
  if (visited.has(`${dataset}:${id}`)) return;
  visited.add(`${dataset}:${id}`);
  
  // Check if node already exists (from another dataset)
  let node = nodes.get(id);
  if (node) {
    // Merge dataset information
    if (!node.datasets) {
      node.datasets = [node.dataset];
    }
    if (!node.datasets.includes(dataset)) {
      node.datasets.push(dataset);
    }
  } else {
    // Create new node
    const label = incident.title || incident.name || incident.incidentId || id.split('/').pop() || id;
    node = {
      id,
      label: String(label).substring(0, 50),
      type,
      value: incident,
      dataset,
      datasets: [dataset],
      connectionCount: 0,
    };
    nodes.set(id, node);
  }
  
  // Only process relationships if we haven't reached max depth
  if (currentDepth < maxDepth) {
    Object.entries(incident).forEach(([key, value]) => {
      if (key.startsWith('@') || key.startsWith('ui:')) return;
      
      if (Array.isArray(value)) {
        value.forEach((item: any) => {
          if (item && typeof item === 'object' && '@id' in item && item['@id']) {
            // Find the full entity from extracted data
            const targetType = '@type' in item ? (item['@type'] as string) : undefined;
            const targetId = item['@id'] as string;
            const targetEntities = targetType ? (normalizedData.extracted[targetType] || []) : [];
            const targetEntity = targetEntities.find((e: any) => e['@id'] === targetId);
            
            if (targetEntity) {
              edges.push({
                source: id,
                target: targetId,
                label: key,
                type: 'relationship',
                dataset
              });
              
              // Recursively process connected entity with incremented depth
              extractIncidentGraph(
                targetEntity, 
                dataset, 
                normalizedData, 
                nodes, 
                edges, 
                visited,
                currentDepth + 1,
                maxDepth
              );
            }
          }
        });
      } else if (value && typeof value === 'object' && '@id' in value && value['@id']) {
        const targetType = '@type' in value ? (value['@type'] as string) : undefined;
        const targetId = value['@id'] as string;
        const targetEntities = targetType ? (normalizedData.extracted[targetType] || []) : [];
        const targetEntity = targetEntities.find((e: any) => e['@id'] === targetId);
        
        if (targetEntity) {
          edges.push({
            source: id,
            target: targetId,
            label: key,
            type: 'relationship',
            dataset
          });
          
          // Recursively process connected entity with incremented depth
          extractIncidentGraph(
            targetEntity, 
            dataset, 
            normalizedData, 
            nodes, 
            edges, 
            visited,
            currentDepth + 1,
            maxDepth
          );
        }
      }
    });
  }
}

/**
 * Process multiple datasets and create a unified graph
 */
export function processMultiDatasetGraph(datasets: DatasetConfig[]): {
  nodes: MultiDatasetGraphNode[];
  edges: MultiDatasetGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    crossDatasetLinks: number;
    nodesByDataset: Record<string, number>;
    nodesByType: Record<string, number>;
    incidentStats: {
      totalAvailable: Record<string, number>;
      displayed: Record<string, number>;
      limited: Record<string, boolean>;
    };
    renderingStats: {
      actualNodes: number;
      potentialNodes: number;
      actualEdges: number;
      potentialEdges: number;
      nodeReduction: number;
      edgeReduction: number;
    };
  };
} {
  const nodes = new Map<string, MultiDatasetGraphNode>();
  const edges: MultiDatasetGraphEdge[] = [];
  const visited = new Set<string>();
  
  // Track incident statistics
  const incidentStats = {
    totalAvailable: {} as Record<string, number>,
    displayed: {} as Record<string, number>,
    limited: {} as Record<string, boolean>,
  };
  
  // Calculate potential nodes/edges if we included ALL incidents
  const potentialNodes = new Map<string, MultiDatasetGraphNode>();
  const potentialEdges: MultiDatasetGraphEdge[] = [];
  const potentialVisited = new Set<string>();
  
  // First pass: Calculate potential statistics with ALL incidents (limited sample)
  datasets.forEach(dataset => {
    const incidentTypes = Object.keys(dataset.data.extracted).filter(type => 
      type.includes('Incident') || type.includes('Death')
    );
    
    incidentTypes.forEach(incidentType => {
      const allIncidents = dataset.data.extracted[incidentType] || [];
      // Sample calculation: take first 50 incidents to estimate potential
      const sampleIncidents = allIncidents.slice(0, 50);
      
      sampleIncidents.forEach(incident => {
        extractIncidentGraph(
          incident,
          dataset.id,
          dataset.data,
          potentialNodes,
          potentialEdges,
          potentialVisited
        );
      });
    });
  });
  
  // Second pass: Process with actual limits
  datasets.forEach(dataset => {
    // Determine incident types for this dataset
    const incidentTypes = Object.keys(dataset.data.extracted).filter(type => 
      type.includes('Incident') || type.includes('Death')
    );
    
    // Calculate total incidents for this dataset
    const totalIncidentsInDataset = incidentTypes.reduce((sum, type) => {
      return sum + (dataset.data.extracted[type]?.length || 0);
    }, 0);
    
    incidentStats.totalAvailable[dataset.id] = totalIncidentsInDataset;
    incidentStats.displayed[dataset.id] = 0;
    
    incidentTypes.forEach(incidentType => {
      const allIncidents = dataset.data.extracted[incidentType] || [];
      
      // Get top incidents by connection count
      const topIncidents = getTopIncidents(
        dataset.data, 
        incidentType, 
        MULTI_DATASET_CONFIG.maxIncidentsPerDataset
      );
      
      // Track how many we're actually displaying
      incidentStats.displayed[dataset.id] += topIncidents.length;
      
      // Extract graph for each top incident with depth limit
      topIncidents.forEach(incident => {
        extractIncidentGraph(
          incident,
          dataset.id,
          dataset.data,
          nodes,
          edges,
          visited,
          0, // Start at depth 0
          MULTI_DATASET_CONFIG.maxDepth
        );
      });
    });
    
    // Mark if this dataset was limited
    incidentStats.limited[dataset.id] = 
      incidentStats.displayed[dataset.id] < incidentStats.totalAvailable[dataset.id];
  });
  
  // Calculate node degrees and connection counts
  const nodeArray = Array.from(nodes.values());
  
  nodeArray.forEach(node => {
    node.connectionCount = 0;
  });
  
  edges.forEach(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    
    const sourceNode = nodes.get(sourceId);
    const targetNode = nodes.get(targetId);
    
    if (sourceNode) sourceNode.connectionCount! += 1;
    if (targetNode) targetNode.connectionCount! += 1;
  });
  
  // Calculate statistics
  const crossDatasetLinks = nodeArray.filter(node => 
    node.datasets && node.datasets.length > 1
  ).length;
  
  const nodesByDataset: Record<string, number> = {};
  const nodesByType: Record<string, number> = {};
  
  nodeArray.forEach(node => {
    // Count by dataset
    if (node.datasets) {
      node.datasets.forEach(ds => {
        nodesByDataset[ds] = (nodesByDataset[ds] || 0) + 1;
      });
    } else {
      nodesByDataset[node.dataset] = (nodesByDataset[node.dataset] || 0) + 1;
    }
    
    // Count by type
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  });
  
  // Set node radius based on connection count
  const maxConnections = Math.max(...nodeArray.map(n => n.connectionCount || 0));
  nodeArray.forEach(node => {
    const normalized = maxConnections > 0 ? (node.connectionCount || 0) / maxConnections : 0;
    node.radius = 10 + normalized * 30; // 10-40 radius range
  });
  
  // Calculate rendering statistics
  const potentialNodeCount = potentialNodes.size;
  const potentialEdgeCount = potentialEdges.length;
  const actualNodeCount = nodeArray.length;
  const actualEdgeCount = edges.length;
  
  const nodeReduction = potentialNodeCount > 0 
    ? Math.round(((potentialNodeCount - actualNodeCount) / potentialNodeCount) * 100)
    : 0;
  const edgeReduction = potentialEdgeCount > 0
    ? Math.round(((potentialEdgeCount - actualEdgeCount) / potentialEdgeCount) * 100)
    : 0;
  
  return {
    nodes: nodeArray,
    edges,
    stats: {
      totalNodes: nodeArray.length,
      totalEdges: edges.length,
      crossDatasetLinks,
      nodesByDataset,
      nodesByType,
      incidentStats,
      renderingStats: {
        actualNodes: actualNodeCount,
        potentialNodes: potentialNodeCount,
        actualEdges: actualEdgeCount,
        potentialEdges: potentialEdgeCount,
        nodeReduction,
        edgeReduction
      }
    }
  };
}

/**
 * Get color for a node based on its dataset(s) and type
 */
export function getNodeColor(node: MultiDatasetGraphNode): string {
  // Check if this is a special type that should override dataset color
  const typeColor = MULTI_DATASET_CONFIG.typeColors[node.type as keyof typeof MULTI_DATASET_CONFIG.typeColors];
  if (typeColor) return typeColor;
  
  // If node appears in multiple datasets, use a special color
  if (node.datasets && node.datasets.length > 1) {
    return '#6b7280'; // gray for cross-dataset entities
  }
  
  // Use dataset color
  const datasetId = node.datasets ? node.datasets[0] : node.dataset;
  return MULTI_DATASET_CONFIG.datasetColors[datasetId as keyof typeof MULTI_DATASET_CONFIG.datasetColors] || '#94a3b8';
}