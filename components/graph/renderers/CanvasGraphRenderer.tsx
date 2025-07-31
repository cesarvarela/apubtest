'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge, GRAPH_CONFIG, findConnectedNodes } from '../utils/graphUtils';

interface CanvasGraphRendererProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  connectedNodeIds: Set<string>;
  onNodeSelect: (node: GraphNode | null) => void;
  onConnectedNodesChange: (nodeIds: Set<string>) => void;
}

// Centralized render state interface
interface RenderState {
  // Transform state
  transform: { x: number; y: number; k: number };

  // Interaction state  
  hoveredNode: GraphNode | null;
  selectedNode: GraphNode | null;
  connectedNodeIds: Set<string>;

  // UI state
  isPanning: boolean;
  isAnimating: boolean;

  // Data state
  nodes: GraphNode[];
  edges: GraphEdge[];
  visibleEdges: GraphEdge[];
}

// Performance monitoring
const PERF_ENABLED = false;
const perfMark = (name: string) => PERF_ENABLED && performance.mark(name);
const perfMeasure = (name: string, start: string, end: string) => {
  if (PERF_ENABLED) {
    performance.measure(name, start, end);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure && measure.duration > 16) {
      console.warn(`Slow ${name}: ${measure.duration.toFixed(2)}ms`);
    }
  }
};

// Pure rendering engine - takes state and renders
const renderCanvas = (state: RenderState, context: CanvasRenderingContext2D, width: number, height: number) => {
  perfMark('render-start');

  // Clear canvas
  context.clearRect(0, 0, width, height);

  const { transform, selectedNode, connectedNodeIds, hoveredNode, nodes, visibleEdges } = state;
  const showLabels = transform.k >= GRAPH_CONFIG.visual.labelVisibilityThreshold || selectedNode !== null;

  // Draw edges first (behind nodes)
  visibleEdges.forEach(edge => {
    const source = edge.source as GraphNode;
    const target = edge.target as GraphNode;

    if (!source.x || !source.y || !target.x || !target.y) return;

    const x1 = source.x * transform.k + transform.x;
    const y1 = source.y * transform.k + transform.y;
    const x2 = target.x * transform.k + transform.x;
    const y2 = target.y * transform.k + transform.y;

    // Viewport culling
    const margin = 50;
    if (Math.max(x1, x2) < -margin || Math.min(x1, x2) > width + margin ||
      Math.max(y1, y2) < -margin || Math.min(y1, y2) > height + margin) {
      return;
    }

    // Draw edge
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.strokeStyle = '#94a3b8';
    context.lineWidth = 3 * transform.k;
    context.globalAlpha = 1.0;
    context.stroke();

    // Draw arrowhead
    if (transform.k > 0.3) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLength = 10 * transform.k;
      const targetRadius = (target.radius || 15) * transform.k;
      const arrowX = x2 - Math.cos(angle) * targetRadius;
      const arrowY = y2 - Math.sin(angle) * targetRadius;

      context.beginPath();
      context.moveTo(arrowX, arrowY);
      context.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      context.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      context.closePath();
      context.fillStyle = '#94a3b8';
      context.fill();
    }
  });

  // Draw nodes
  nodes.forEach(node => {
    if (!node.x || !node.y) return;

    const x = node.x * transform.k + transform.x;
    const y = node.y * transform.k + transform.y;
    const radius = (node.radius || 15) * transform.k;

    // Viewport culling
    const margin = radius * 2;
    if (x < -margin || x > width + margin || y < -margin || y > height + margin) {
      return;
    }

    // Determine node opacity
    const isHovered = hoveredNode?.id === node.id;
    let opacity = 0.8;

    if (selectedNode) {
      if (node.id === selectedNode.id) {
        opacity = 1.0;
      } else if (connectedNodeIds.has(node.id)) {
        opacity = isHovered ? 1.0 : 0.9;
      } else {
        opacity = isHovered ? 0.5 : 0.3;
      }
    } else {
      opacity = isHovered ? 1.0 : 0.8;
    }

    // Get node color
    const colors = GRAPH_CONFIG.nodeColors;
    const color = colors[node.type as keyof typeof colors] || colors.unknown;

    // Draw node circle
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.globalAlpha = opacity;
    context.fill();

    // Draw stroke
    context.strokeStyle = selectedNode?.id === node.id ? '#000' : '#fff';
    context.lineWidth = (selectedNode?.id === node.id ? 4 : 2) * transform.k;
    context.globalAlpha = 1.0;
    context.stroke();

    // Draw hover effect
    if (isHovered) {
      context.beginPath();
      context.arc(x, y, radius + 5 * transform.k, 0, 2 * Math.PI);
      context.strokeStyle = color;
      context.lineWidth = 1 * transform.k;
      context.globalAlpha = 0.5;
      context.stroke();
    }
  });

  // Draw labels last (on top)
  if (showLabels) {
    nodes.forEach(node => {
      if (!node.x || !node.y) return;

      const x = node.x * transform.k + transform.x;
      const y = node.y * transform.k + transform.y;
      const radius = (node.radius || 15) * transform.k;

      // Skip if label is outside visible area
      if (x < -100 || x > width + 100 || y < -50 || y > height + 50) {
        return;
      }

      const fontSize = 12;
      const label = node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label;

      context.font = `bold ${fontSize}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Draw label background
      const textMetrics = context.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const padding = 4;

      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(
        x - textWidth / 2 - padding,
        y + radius + 10 - textHeight / 2 - padding,
        textWidth + padding * 2,
        textHeight + padding * 2
      );

      // Draw label text
      context.fillStyle = '#1f2937';
      context.globalAlpha = 1.0;
      context.fillText(label, x, y + radius + 10);
    });
  }

  // Reset global alpha
  context.globalAlpha = 1.0;

  perfMark('render-end');
  perfMeasure('render', 'render-start', 'render-end');
};

// Transform Manager Hook
const useTransform = () => {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.1 });

  const zoom = useCallback((factor: number, center: { x: number; y: number }) => {
    setTransform(prev => {
      const newK = Math.min(Math.max(prev.k * factor, 0.02), 10);
      const scaleFactor = newK / prev.k;
      const newX = center.x - (center.x - prev.x) * scaleFactor;
      const newY = center.y - (center.y - prev.y) * scaleFactor;

      return { x: newX, y: newY, k: newK };
    });
  }, []);

  const pan = useCallback((delta: { x: number; y: number }) => {
    setTransform(prev => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y,
      k: prev.k
    }));
  }, []);

  const reset = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 });
  }, []);

  const setZoom = useCallback((k: number) => {
    setTransform(prev => ({ ...prev, k: Math.min(Math.max(k, 0.02), 10) }));
  }, []);

  return { transform, zoom, pan, reset, setZoom };
};

// Interaction Manager Hook
const useInteraction = () => {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [mouseState, setMouseState] = useState<{
    position: { x: number; y: number };
    targetNode: GraphNode | null;
    hasMoved: boolean;
  }>({ position: { x: 0, y: 0 }, targetNode: null, hasMoved: false });

  const startPan = useCallback((position: { x: number; y: number }) => {
    setIsPanning(true);
    setMouseState(prev => ({ ...prev, position }));
  }, []);

  const stopPan = useCallback(() => {
    setIsPanning(false);
    setMouseState({ position: { x: 0, y: 0 }, targetNode: null, hasMoved: false });
  }, []);

  const updateMouseState = useCallback((position: { x: number; y: number }, targetNode: GraphNode | null, hasMoved: boolean) => {
    setMouseState({ position, targetNode, hasMoved });
  }, []);

  return {
    hoveredNode,
    setHoveredNode,
    isPanning,
    startPan,
    stopPan,
    mouseState,
    updateMouseState
  };
};

// Layout Manager Hook
const useLayout = (inputNodes: GraphNode[], inputEdges: GraphEdge[], width: number, height: number) => {
  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>(inputNodes);
  const [isAnimating, setIsAnimating] = useState(false);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const startLayout = useCallback(() => {
    if (!inputNodes.length) return;

    setIsAnimating(true);

    // Initialize node positions
    const centerX = width / 2;
    const centerY = height / 2;

    /*
    const nodesByDegree = [...inputNodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));
    const maxDegree = Math.max(...nodesByDegree.map(n => n.degree || 0));

    nodesByDegree.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) return;

      const degree = node.degree || 0;
      const degreeRatio = maxDegree > 0 ? degree / maxDegree : 0;
      const maxRadius = Math.min(GRAPH_CONFIG.visual.svgWidth, GRAPH_CONFIG.visual.svgHeight) * 5.0;
      const radius = (1 - degreeRatio) * maxRadius;
      const angle = Math.random() * 2 * Math.PI;

      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
    */

    // Simple center positioning
    inputNodes.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) return;
      node.x = centerX;
      node.y = centerY;
    });

    // Calculate maxDegree for force simulation
    const maxDegree = Math.max(...inputNodes.map(n => n.degree || 0));

    // Create simulation
    const { minLinkStrength, maxLinkStrength, collisionBuffer, massMultiplier } = GRAPH_CONFIG.forces;

    inputNodes.forEach(node => {
      const degree = node.degree || 0;
      const degreeRatio = maxDegree > 0 ? degree / maxDegree : 0;
      node.fx = null;
      node.fy = null;
      (node as any).mass = 1 + degreeRatio * massMultiplier;
    });

    const simulation = d3.forceSimulation<GraphNode>(inputNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(inputEdges)
        .id(d => d.id)
        .distance(0)
        .strength(d => {
          const source = d.source as GraphNode;
          const degree = source.degree || 0;
          const normalizedDegree = maxDegree > 0 ? degree / maxDegree : 0;
          return minLinkStrength + normalizedDegree * (maxLinkStrength - minLinkStrength);
        }))
      .force('collide', d3.forceCollide().radius(d => ((d as GraphNode).radius || 15) + collisionBuffer))
      .alpha(1)           // Start with full energy
      .alphaMin(0.001)    // Run until very low energy (default is 0.001)
      .alphaDecay(0.005)  // Even slower energy decay for much longer simulation
      .velocityDecay(0.2) // Lower velocity decay for smoother movement (default is 0.4)
      // .stop();

    simulation.on('tick', () => {
      setLayoutNodes([...inputNodes]);
    });

    simulation.on('end', () => {
      setIsAnimating(false);
      setLayoutNodes([...inputNodes]);
    });

    simulationRef.current = simulation;
  }, [inputNodes, inputEdges, width, height]);

  const stopLayout = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // Update layout nodes when input changes
  useEffect(() => {
    setLayoutNodes(inputNodes);
  }, [inputNodes]);

  return { layoutNodes, isAnimating, startLayout, stopLayout };
};

// Single Render Loop Hook - manages the unified render loop
const useRenderLoop = (
  state: RenderState,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number
) => {
  const animationFrameRef = useRef<number | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas with high-DPI support
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const context = canvas.getContext('2d');
    if (!context) return null;

    const devicePixelRatio = window.devicePixelRatio || 1;

    // Set canvas size with device pixel ratio scaling
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Scale context for high-DPI displays
    context.scale(devicePixelRatio, devicePixelRatio);

    contextRef.current = context;
    return context;
  }, [width, height, canvasRef]);

  // Request render - throttled to animation frame
  const requestRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const context = contextRef.current;
      if (!context) return;

      renderCanvas(state, context, width, height);
      animationFrameRef.current = null;
    });
  }, [state, width, height]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    contextRef.current = null;
  }, []);

  return { setupCanvas, requestRender, cleanup };
};

export default function CanvasGraphRenderer({
  nodes,
  edges,
  selectedNode,
  connectedNodeIds,
  onNodeSelect,
  onConnectedNodesChange
}: CanvasGraphRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const width = canvasSize.width;
  const height = canvasSize.height;

  // Initialize the new architecture hooks
  const { transform, zoom, pan } = useTransform();
  const { hoveredNode, setHoveredNode, isPanning, startPan, stopPan, mouseState, updateMouseState } = useInteraction();
  const { layoutNodes, isAnimating, startLayout, stopLayout } = useLayout(nodes, edges, width, height);

  // Pre-compute visible edges based on selected node
  const visibleEdges = useMemo(() => {
    if (!selectedNode) return [];

    return edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return sourceId === selectedNode.id || targetId === selectedNode.id;
    });
  }, [edges, selectedNode]);

  // Pre-compute visible nodes based on selected node
  const visibleNodes = useMemo(() => {
    if (!selectedNode) return layoutNodes;

    // When a node is selected, only show the selected node and connected nodes
    const visibleNodeIds = new Set([selectedNode.id, ...connectedNodeIds]);
    return layoutNodes.filter(node => visibleNodeIds.has(node.id));
  }, [layoutNodes, selectedNode, connectedNodeIds]);

  // Centralized state for rendering
  const renderState: RenderState = useMemo(() => ({
    transform,
    hoveredNode,
    selectedNode,
    connectedNodeIds,
    isPanning,
    isAnimating,
    nodes: visibleNodes,
    edges,
    visibleEdges
  }), [transform, hoveredNode, selectedNode, connectedNodeIds, isPanning, isAnimating, visibleNodes, edges, visibleEdges]);

  // Initialize render loop
  const { setupCanvas, requestRender, cleanup } = useRenderLoop(renderState, canvasRef, width, height);

  // Simple spatial index for efficient hit detection
  const spatialIndex = useMemo(() => {
    if (!visibleNodes.length) return new Map();

    const cellSize = 100;
    const index = new Map<string, GraphNode[]>();

    visibleNodes.forEach(node => {
      if (!node.x || !node.y) return;

      const screenX = node.x * transform.k + transform.x;
      const screenY = node.y * transform.k + transform.y;

      const cellX = Math.floor(screenX / cellSize);
      const cellY = Math.floor(screenY / cellSize);
      const cellKey = `${cellX},${cellY}`;

      if (!index.has(cellKey)) {
        index.set(cellKey, []);
      }
      index.get(cellKey)!.push(node);
    });

    return index;
  }, [visibleNodes, transform]);

  // Find node at coordinates using spatial indexing
  const findNodeAt = useCallback((x: number, y: number) => {
    const cellSize = 100;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);

    const cellsToCheck = [
      `${cellX},${cellY}`,
      `${cellX - 1},${cellY}`,
      `${cellX + 1},${cellY}`,
      `${cellX},${cellY - 1}`,
      `${cellX},${cellY + 1}`
    ];

    for (const cellKey of cellsToCheck) {
      const cellNodes = spatialIndex.get(cellKey);
      if (!cellNodes) continue;

      for (const node of cellNodes) {
        if (!node.x || !node.y) continue;

        const screenX = node.x * transform.k + transform.x;
        const screenY = node.y * transform.k + transform.y;
        const radius = (node.radius || 15) * transform.k;

        const dx = screenX - x;
        const dy = screenY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          return node;
        }
      }
    }

    return null;
  }, [spatialIndex, transform]);

  // Mouse event handlers that only manage state
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate movement distance from initial mouse down position
    const dx = x - mouseState.position.x;
    const dy = y - mouseState.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MOVEMENT_THRESHOLD = 5;

    // Update mouse state with current position and movement status
    const targetNode = findNodeAt(x, y);
    const hasMoved = distance > MOVEMENT_THRESHOLD;

    updateMouseState({ x, y }, mouseState.targetNode, hasMoved);

    // If we've moved beyond threshold and are in pan mode, start actual panning
    if (isPanning && hasMoved) {
      pan({ x: dx, y: dy });
      canvas.style.cursor = 'grabbing';
    } else if (!isPanning) {
      // Update hover state only if we're not panning
      if (targetNode !== hoveredNode) {
        setHoveredNode(targetNode);
        canvas.style.cursor = targetNode ? 'pointer' : 'default';
      }
    }
  }, [findNodeAt, mouseState, isPanning, hoveredNode, setHoveredNode, updateMouseState, pan]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedNode = findNodeAt(x, y);

    // Always initialize pan state for potential panning
    startPan({ x, y });

    // Store the target node for later click detection
    updateMouseState({ x, y }, clickedNode, false);

    // Set initial cursor based on what's under the cursor
    canvas.style.cursor = clickedNode ? 'pointer' : 'grabbing';
  }, [findNodeAt, startPan, updateMouseState]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle node selection only if this was a click (not a drag)
    if (!mouseState.hasMoved && mouseState.targetNode) {
      const clickedNode = findNodeAt(x, y);

      if (clickedNode && clickedNode.id === mouseState.targetNode.id) {
        if (selectedNode && clickedNode.id === selectedNode.id) {
          onNodeSelect(null);
          onConnectedNodesChange(new Set());
        } else {
          onNodeSelect(clickedNode);
          const connected = findConnectedNodes(clickedNode.id, edges);
          onConnectedNodesChange(connected);
        }
      }
    } else if (!mouseState.hasMoved && !mouseState.targetNode) {
      // Click on background - deselect
      if (selectedNode) {
        onNodeSelect(null);
        onConnectedNodesChange(new Set());
      }
    }

    // Always stop panning state
    stopPan();

    // Reset cursor
    const hoveredNode = findNodeAt(x, y);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  }, [mouseState, findNodeAt, selectedNode, onNodeSelect, onConnectedNodesChange, edges, stopPan]);


  // Initialize canvas and layout
  useEffect(() => {
    if (!nodes.length) return;

    const context = setupCanvas();
    if (!context) return;

    // Add wheel event listener
    const canvas = canvasRef.current;
    if (canvas) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoom(zoomFactor, { x: mouseX, y: mouseY });
      };

      canvas.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [nodes, setupCanvas, zoom]);

  // Start layout when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      startLayout();
    }

    return () => {
      stopLayout();
    };
  }, [nodes, startLayout, stopLayout]);

  // Request render when state changes
  useEffect(() => {
    requestRender();
  }, [renderState, requestRender]);

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Dynamic canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 relative"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block"
      />
    </div>
  );
}