export interface GraphNode {
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
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  type: string;
}

// Configuration object for easy tuning of graph behavior
export const GRAPH_CONFIG = {
  // Node sizing configuration
  nodeSize: {
    minRadius: 15,             // Minimum node size (degree 0)
    maxRadius: 120,            // Maximum node size (degree 1)
    hoverRadiusIncrease: 3,    // Extra radius when hovering
  },

  // Force simulation configuration (simple values)
  forces: {
    minLinkStrength: 0.1,     // Minimum link strength for low-degree nodes
    maxLinkStrength: 2.0,     // Maximum link strength for high-degree nodes
    collisionBuffer: 16,      // Collision buffer for spacing
    massMultiplier: 0.5,      // Mass variation based on degree
  },

  // Performance configuration  
  performance: {
    maxIterations: 3000,      // Maximum layout calculation iterations
    ticksPerFrame: 100,         // Simulation steps per animation frame (reduced to prevent browser freeze)
  },

  // Visual configuration
  visual: {
    labelVisibilityThreshold: 0.6,  // Zoom level to show/hide labels
    svgWidth: 800,                   // SVG canvas width
    svgHeight: 600,                  // SVG canvas height
  },

  // Node colors for different types
  nodeColors: {
    'aiid:Incident': '#ef4444',
    'aiid:Report': '#f59e0b',
    'core:Organization': '#3b82f6',
    'core:Person': '#10b981',
    'unknown': '#8b5cf6'
  } as const
};

export function calculateNodeDegrees(nodes: GraphNode[], edges: GraphEdge[]): void {
  // Initialize degree count for all nodes
  const degreeMap = new Map<string, number>();
  nodes.forEach(node => degreeMap.set(node.id, 0));

  // Count edges for each node
  edges.forEach(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

    degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
    degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
  });

  // Update nodes with degree information
  nodes.forEach(node => {
    node.degree = degreeMap.get(node.id) || 0;
  });
}

export function calculateNodeRadius(degree: number, maxDegree: number): number {
  const { minRadius, maxRadius } = GRAPH_CONFIG.nodeSize;

  // Normalize degree to 0-1 range
  const normalizedDegree = maxDegree > 0 ? degree / maxDegree : 0;
  
  // Linear interpolation between min and max radius
  return minRadius + normalizedDegree * (maxRadius - minRadius);
}

export function findConnectedNodes(nodeId: string, edges: GraphEdge[]): Set<string> {
  const connected = new Set<string>();
  edges.forEach(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

    if (sourceId === nodeId) {
      connected.add(targetId);
    }
    if (targetId === nodeId) {
      connected.add(sourceId);
    }
  });
  return connected;
}

export function extractGraphData(data: any, nodes: GraphNode[] = [], edges: GraphEdge[] = [], visited: Set<string> = new Set()): { nodes: GraphNode[], edges: GraphEdge[] } {
  if (!data || typeof data !== 'object') return { nodes, edges };

  // Skip if this doesn't look like a semantic entity
  if (!data['@id'] && !data.id) return { nodes, edges };

  const id = data['@id'] || data.id;
  const typeValue = data['@type'];

  // Skip if no type is specified
  if (!typeValue) return { nodes, edges };

  // Handle array of types and extract the type name
  let type = Array.isArray(typeValue) ? typeValue[0] : typeValue;

  // Convert expanded URI form to compact form
  if (type.includes('#')) {
    const parts = type.split('#');
    const namespace = parts[0].includes('aiid') ? 'aiid' : 'core';
    type = `${namespace}:${parts[1]}`;
  } else if (type.includes('/')) {
    // Handle other URI formats - extract the last part
    const parts = type.split('/');
    const typeName = parts.pop() || type;
    // Try to infer namespace from the URI
    if (type.includes('aiid')) {
      type = `aiid:${typeName}`;
    } else if (type.includes('core')) {
      type = `core:${typeName}`;
    } else {
      type = typeName;
    }
  }

  // Skip if we've already processed this node
  if (visited.has(id)) return { nodes, edges };
  visited.add(id);

  // Skip nodes that don't represent semantic entities we care about
  const semanticTypes = ['aiid:Incident', 'aiid:Report', 'core:Organization', 'core:Person'];
  if (!semanticTypes.includes(type)) return { nodes, edges };

  // Create node with initial positioning (will be distributed later based on degree)
  const label = data.title || data.name || data.incidentId || id.split('/').pop() || id;
  nodes.push({
    id,
    label: String(label),
    type,
    value: data,
    x: undefined, // Will be set later based on degree
    y: undefined, // Will be set later based on degree
    fx: null,
    fy: null
  });

  // Process relationships
  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith('@') || key.startsWith('ui:')) return;

    if (Array.isArray(value)) {
      value.forEach((item: any, index: number) => {
        if (item && typeof item === 'object' && (item['@id'] || item.id)) {
          const childId = item['@id'] || item.id || `${id}_${key}_${index}`;
          edges.push({
            source: id,
            target: childId,
            label: key,
            type: 'array'
          });
          extractGraphData(item, nodes, edges, visited);
        }
      });
    } else if (value && typeof value === 'object' && ((value as any)['@id'] || (value as any).id)) {
      const childId = (value as any)['@id'] || (value as any).id || `${id}_${key}`;
      edges.push({
        source: id,
        target: childId,
        label: key,
        type: 'object'
      });
      extractGraphData(value, nodes, edges, visited);
    }
  });

  return { nodes, edges };
}

export function processGraphData(expandedPayload: any): { nodes: GraphNode[], edges: GraphEdge[] } {
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  const visited = new Set<string>();

  if (Array.isArray(expandedPayload)) {
    // Process each item in the array, sharing nodes/edges/visited to consolidate duplicates
    expandedPayload.forEach(item => {
      if (item && typeof item === 'object') {
        extractGraphData(item, nodes, edges, visited);
      }
    });
  } else {
    // Handle single payload
    const result = extractGraphData(expandedPayload);
    nodes = result.nodes;
    edges = result.edges;
  }

  // Calculate node degrees after extraction
  calculateNodeDegrees(nodes, edges);

  // Find max degree for normalization
  const maxDegree = Math.max(...nodes.map(n => n.degree || 0));

  // Pre-compute node radii for performance
  nodes.forEach(node => {
    node.radius = calculateNodeRadius(node.degree || 0, maxDegree);
  });

  return { nodes, edges };
}