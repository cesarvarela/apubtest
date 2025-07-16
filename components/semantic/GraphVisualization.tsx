'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphVisualizationProps {
  expandedPayload: any;
  context?: any;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  value?: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  type: string;
}

function extractGraphData(data: any, nodes: GraphNode[] = [], edges: GraphEdge[] = [], visited: Set<string> = new Set()): { nodes: GraphNode[], edges: GraphEdge[] } {
  if (!data || typeof data !== 'object') return { nodes, edges };
  
  const id = data['@id'] || data.id || `node_${nodes.length}`;
  const typeValue = data['@type'] || 'unknown';
  // Handle array of types and extract the type name
  let type = Array.isArray(typeValue) ? typeValue[0] : typeValue;
  
  // Convert expanded URI form to compact form
  if (type.includes('#')) {
    const parts = type.split('#');
    const namespace = parts[0].includes('aiid') ? 'aiid' : 'core';
    type = `${namespace}:${parts[1]}`;
  } else if (type.includes('/')) {
    // Handle other URI formats
    type = type.split('/').pop() || type;
  }
  
  if (visited.has(id)) return { nodes, edges };
  visited.add(id);
  
  // Create node
  const label = data.title || data.name || data.incidentId || id.split('/').pop() || id;
  nodes.push({
    id,
    label: String(label),
    type,
    value: data,
    x: 400 + (Math.random() - 0.5) * 200,
    y: 300 + (Math.random() - 0.5) * 200,
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

export default function GraphVisualization({ expandedPayload, context }: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  useEffect(() => {
    if (!containerRef.current || !expandedPayload) return;
    
    const { nodes, edges } = extractGraphData(expandedPayload);
    
    // Clear previous content
    d3.select(containerRef.current).selectAll('*').remove();
    
    const width = 800;
    const height = 600;
    
    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');
    
    // Define arrowhead marker for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#94a3b8')
      .style('stroke', 'none');
    
    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Create edge elements
    const link = svg.append('g')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');
    
    // Create edge labels
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(edges)
      .join('text')
      .attr('class', 'edge-label')
      .attr('font-size', 10)
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .text(d => d.label);
    
    // Create node group
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => {
        const colors = {
          'aiid:Incident': '#ef4444',
          'aiid:Report': '#f59e0b',
          'core:Organization': '#3b82f6',
          'core:Person': '#10b981',
          'unknown': '#8b5cf6'
        };
        return colors[d.type as keyof typeof colors] || colors.unknown;
      })
      .attr('opacity', 0.8);
    
    // Add labels to nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 30)
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label);
    
    // Add drag behavior
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    
    node.call(drag);
    
    // Add click handler
    node.on('click', (event, d) => {
      setSelectedNode(d);
    });
    
    // Add hover effects
    node.on('mouseenter', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 25)
        .attr('opacity', 1);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 20)
        .attr('opacity', 0.8);
    });
    
    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);
      
      linkLabel
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);
      
      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });
    
    return () => {
      simulation.stop();
    };
  }, [expandedPayload, context]);
  
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Graph Visualization
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Incident</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Report</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Organization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Person</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Drag nodes to reposition them. Click on a node to see details.
        </div>
        
        <div 
          ref={containerRef}
          className="w-full border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
        />
      </div>
      
      {selectedNode && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Selected Node: {selectedNode.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Type: {selectedNode.type}
          </p>
          <pre className="text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-48">
            {JSON.stringify(selectedNode.value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}