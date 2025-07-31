'use client';

import { useState, useMemo } from 'react';
import { GraphNode, processGraphData, findConnectedNodes } from './utils/graphUtils';
import CanvasGraphRenderer from './renderers/CanvasGraphRenderer';
import SemanticRenderer from '../semantic/SemanticRenderer';

interface GraphVisualizationProps {
  expandedPayload: any;
  context?: any;
}

export default function GraphVisualization({ expandedPayload, context }: GraphVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [connectedNodeIds, setConnectedNodeIds] = useState<Set<string>>(new Set());

  const { nodes, edges } = useMemo(() => {
    if (!expandedPayload) {
      return { nodes: [], edges: [] };
    }
    return processGraphData(expandedPayload);
  }, [expandedPayload]);

  if (!expandedPayload) {
    return <div>No data to visualize</div>;
  }

  if (nodes.length === 0) {
    return <div>No semantic entities found to visualize</div>;
  }

  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node);
  };

  const handleConnectedNodesChange = (nodeIds: Set<string>) => {
    setConnectedNodeIds(nodeIds);
  };

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

        <CanvasGraphRenderer
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          connectedNodeIds={connectedNodeIds}
          onNodeSelect={handleNodeSelect}
          onConnectedNodesChange={handleConnectedNodesChange}
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

          {connectedNodeIds.size > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Connected Nodes ({connectedNodeIds.size})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Array.from(connectedNodeIds).map(nodeId => {
                  // Find the edge connecting this node to the selected node
                  const connectedEdge = edges.find(edge => {
                    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                    return (sourceId === selectedNode.id && targetId === nodeId) ||
                      (sourceId === nodeId && targetId === selectedNode.id);
                  });

                  if (!connectedEdge) return null;

                  const relationshipType = connectedEdge.label;

                  // Find the actual node data from the nodes array
                  const actualNodeData = nodes.find(node => node.id === nodeId);

                  let nodeName, nodeType;
                  if (actualNodeData) {
                    nodeName = actualNodeData.label;
                    nodeType = actualNodeData.type;
                  } else {
                    nodeName = nodeId.split('/').pop() || nodeId;
                    nodeType = 'unknown';
                  }

                  return (
                    <div
                      key={nodeId}
                      className="p-2 bg-gray-50 dark:bg-zinc-700 rounded border text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                      onClick={() => {
                        if (actualNodeData) {
                          setSelectedNode(actualNodeData);
                          const newConnected = findConnectedNodes(actualNodeData.id, edges);
                          setConnectedNodeIds(newConnected);
                        }
                      }}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {nodeName}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {nodeType} • via &quot;{relationshipType}&quot;
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <SemanticRenderer
              expandedPayload={selectedNode.value}
              context={context}
            />
          </div>
        </div>
      )}
    </div>
  );
}