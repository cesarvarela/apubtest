'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  MultiDatasetGraphNode, 
  MultiDatasetGraphEdge, 
  MULTI_DATASET_CONFIG,
  getNodeColor 
} from '../utils/multiDatasetGraphUtils';

interface MultiDatasetGraphRendererProps {
  nodes: MultiDatasetGraphNode[];
  edges: MultiDatasetGraphEdge[];
  width?: number;
  height?: number;
  onNodeSelect?: (node: MultiDatasetGraphNode | null) => void;
  selectedNode?: MultiDatasetGraphNode | null;
}

// Centralized render state interface
interface MultiDatasetRenderState {
  // Data
  nodes: MultiDatasetGraphNode[];
  edges: MultiDatasetGraphEdge[];
  
  // Transform
  transform: { x: number; y: number; k: number };
  
  // Interaction
  hoveredNode: MultiDatasetGraphNode | null;
  selectedNode: MultiDatasetGraphNode | null;
  
  // Canvas dimensions
  width: number;
  height: number;
}

// Pure rendering function - no hooks, no state updates, just drawing
const renderMultiDatasetCanvas = (
  state: MultiDatasetRenderState,
  ctx: CanvasRenderingContext2D
) => {
  const { nodes, edges, transform, hoveredNode, selectedNode, width, height } = state;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply transform
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);

  // Calculate viewport bounds in world space for culling
  const viewportLeft = -transform.x / transform.k;
  const viewportTop = -transform.y / transform.k;
  const viewportRight = (width - transform.x) / transform.k;
  const viewportBottom = (height - transform.y) / transform.k;
  const margin = 100 / transform.k;

  // Draw edges
  edges.forEach(edge => {
    const source = edge.source as MultiDatasetGraphNode;
    const target = edge.target as MultiDatasetGraphNode;

    if (!source.x || !source.y || !target.x || !target.y) return;

    // Viewport culling for edges
    const minX = Math.min(source.x, target.x);
    const maxX = Math.max(source.x, target.x);
    const minY = Math.min(source.y, target.y);
    const maxY = Math.max(source.y, target.y);

    if (maxX < viewportLeft - margin || minX > viewportRight + margin || 
        maxY < viewportTop - margin || minY > viewportBottom + margin) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    
    // Style based on selection
    if (selectedNode && (source.id === selectedNode.id || target.id === selectedNode.id)) {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
    } else {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
    }
    
    ctx.stroke();
  });

  // Reset alpha
  ctx.globalAlpha = 1;

  // Draw nodes
  nodes.forEach(node => {
    if (!node.x || !node.y) return;

    const radius = node.radius || 15;
    
    // Viewport culling for nodes
    if (node.x + radius < viewportLeft - margin || 
        node.x - radius > viewportRight + margin ||
        node.y + radius < viewportTop - margin || 
        node.y - radius > viewportBottom + margin) {
      return;
    }

    const isHovered = hoveredNode?.id === node.id;
    const isSelected = selectedNode?.id === node.id;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    
    // Set fill color based on dataset
    ctx.fillStyle = getNodeColor(node);
    
    // Adjust opacity based on selection
    if (selectedNode && !isSelected) {
      const isConnected = edges.some(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return (sourceId === selectedNode.id && targetId === node.id) ||
               (targetId === selectedNode.id && sourceId === node.id);
      });
      ctx.globalAlpha = isConnected ? 0.8 : 0.2;
    } else {
      ctx.globalAlpha = 1;
    }
    
    ctx.fill();

    // Draw border
    if (isSelected) {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
    } else if (isHovered) {
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
    } else if (node.datasets && node.datasets.length > 1) {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
    } else {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw dataset badges for multi-dataset nodes
    if (node.datasets && node.datasets.length > 1 && node.x && node.y) {
      const badgeRadius = 6;
      node.datasets.forEach((datasetId, index) => {
        const angle = (index * 2 * Math.PI) / node.datasets!.length - Math.PI / 2;
        const badgeX = node.x! + (radius + 8) * Math.cos(angle);
        const badgeY = node.y! + (radius + 8) * Math.sin(angle);
        
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = MULTI_DATASET_CONFIG.datasetColors[datasetId as keyof typeof MULTI_DATASET_CONFIG.datasetColors];
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Reset alpha
    ctx.globalAlpha = 1;

    // Draw labels for important nodes when zoomed in
    if ((transform.k > 1.5 && (node.connectionCount || 0) > 3) || 
        (transform.k > 0.8 && (isHovered || isSelected))) {
      ctx.font = `${Math.max(10, 12 / transform.k)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const textMetrics = ctx.measureText(node.label);
      const textHeight = 14;
      const padding = 2;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        node.x - textMetrics.width / 2 - padding,
        node.y + radius + 4,
        textMetrics.width + padding * 2,
        textHeight + padding * 2
      );
      
      ctx.fillStyle = '#1f2937';
      ctx.fillText(node.label, node.x, node.y + radius + 6);
    }
  });

  ctx.restore();
};

export default function MultiDatasetGraphRenderer({
  nodes,
  edges,
  width = 800,
  height = 600,
  onNodeSelect,
  selectedNode
}: MultiDatasetGraphRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const simulationRef = useRef<d3.Simulation<MultiDatasetGraphNode, MultiDatasetGraphEdge> | null>(null);
  
  // State
  const [hoveredNode, setHoveredNode] = useState<MultiDatasetGraphNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  
  // Track if we're actively interacting
  const [isPanning, setIsPanning] = useState(false);
  
  // Mouse state to distinguish clicks from drags
  const [mouseState, setMouseState] = useState<{
    position: { x: number; y: number };
    targetNode: MultiDatasetGraphNode | null;
    hasMoved: boolean;
  }>({ position: { x: 0, y: 0 }, targetNode: null, hasMoved: false });

  // Memoized render state
  const renderState = useMemo<MultiDatasetRenderState>(() => ({
    nodes,
    edges,
    transform,
    hoveredNode,
    selectedNode: selectedNode || null,
    width,
    height
  }), [nodes, edges, transform, hoveredNode, selectedNode, width, height]);

  // Single render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    contextRef.current = ctx;

    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Continuous render loop
    const render = () => {
      if (contextRef.current) {
        renderMultiDatasetCanvas(renderState, contextRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderState, width, height]);

  // Initialize force simulation
  useEffect(() => {
    if (!nodes.length) return;

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create new simulation
    const simulation = d3.forceSimulation<MultiDatasetGraphNode>(nodes)
      .force('link', d3.forceLink<MultiDatasetGraphNode, MultiDatasetGraphEdge>(edges)
        .id(d => d.id)
        .distance(MULTI_DATASET_CONFIG.forces.linkDistance)
        .strength(MULTI_DATASET_CONFIG.forces.linkStrength)
      )
      .force('charge', d3.forceManyBody()
        .strength(MULTI_DATASET_CONFIG.forces.chargeStrength)
      )
      .force('center', d3.forceCenter(width / 2, height / 2)
        .strength(MULTI_DATASET_CONFIG.forces.centerStrength)
      )
      .force('collision', d3.forceCollide()
        .radius(d => (d as MultiDatasetGraphNode).radius || MULTI_DATASET_CONFIG.forces.collisionRadius)
      )
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    // Simulation just updates node positions, rendering happens independently
    simulation.on('tick', () => {
      // Positions are updated in place on the nodes array
      // The render loop will pick up these changes automatically
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height]);

  // Find node at position
  const findNodeAt = useCallback((x: number, y: number): MultiDatasetGraphNode | null => {
    const transformedX = (x - transform.x) / transform.k;
    const transformedY = (y - transform.y) / transform.k;

    for (const node of nodes) {
      if (!node.x || !node.y) continue;
      
      const dx = node.x - transformedX;
      const dy = node.y - transformedY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= (node.radius || 15)) {
        return node;
      }
    }
    return null;
  }, [nodes, transform]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate movement distance from initial mouse down position
    const dx = x - mouseState.position.x;
    const dy = y - mouseState.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MOVEMENT_THRESHOLD = 5;

    // Update mouse state with movement status
    const hasMoved = distance > MOVEMENT_THRESHOLD;
    
    // If we've moved beyond threshold and mouse is down, start panning
    if (isPanning && hasMoved) {
      setMouseState(prev => ({ ...prev, hasMoved: true }));
      
      // Pan the view
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      // Update mouse position for next move
      setMouseState(prev => ({ ...prev, position: { x, y } }));
      canvas.style.cursor = 'grabbing';
    } else if (!isPanning) {
      // Update hover state only if we're not panning
      const node = findNodeAt(x, y);
      if (node !== hoveredNode) {
        setHoveredNode(node);
        canvas.style.cursor = node ? 'pointer' : 'default';
      }
    }
  }, [isPanning, mouseState.position, findNodeAt, hoveredNode]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = findNodeAt(x, y);
    
    // Store the initial mouse position and target node
    setMouseState({
      position: { x, y },
      targetNode: node,
      hasMoved: false
    });
    
    // Set isPanning flag (but actual panning only starts after movement threshold)
    setIsPanning(true);
    
    // Set initial cursor
    canvas.style.cursor = node ? 'pointer' : 'grab';
  }, [findNodeAt]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle node selection only if this was a click (not a drag)
    if (!mouseState.hasMoved) {
      const clickedNode = findNodeAt(x, y);
      
      if (onNodeSelect) {
        if (clickedNode && mouseState.targetNode && clickedNode.id === mouseState.targetNode.id) {
          // Clicked on a node - toggle selection
          onNodeSelect(clickedNode === selectedNode ? null : clickedNode);
        } else if (!mouseState.targetNode) {
          // Clicked on empty space - deselect
          onNodeSelect(null);
        }
      }
    }

    // Reset interaction state
    setIsPanning(false);
    setMouseState({ position: { x: 0, y: 0 }, targetNode: null, hasMoved: false });
    
    // Reset cursor
    const hoveredNode = findNodeAt(x, y);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  }, [mouseState, findNodeAt, onNodeSelect, selectedNode]);

  // Wheel handler for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Smooth zoom with reduced sensitivity
    const zoomIntensity = 0.001;
    const scaleFactor = 1 - e.deltaY * zoomIntensity;
    const newK = Math.min(Math.max(transform.k * scaleFactor, 0.1), 5);
    
    // Zoom toward mouse position
    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  }, [transform]);

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
      draggable={false}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setMouseState({ position: { x: 0, y: 0 }, targetNode: null, hasMoved: false });
      }}
      onClick={(e) => e.preventDefault()}
    />
  );
}