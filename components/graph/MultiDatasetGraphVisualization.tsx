'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiDatasetGraphRenderer from './renderers/MultiDatasetGraphRenderer';
import { 
  DatasetConfig, 
  MultiDatasetGraphNode,
  processMultiDatasetGraph,
  MULTI_DATASET_CONFIG 
} from './utils/multiDatasetGraphUtils';

interface MultiDatasetGraphVisualizationProps {
  datasets: DatasetConfig[];
}

export default function MultiDatasetGraphVisualization({ datasets }: MultiDatasetGraphVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<MultiDatasetGraphNode | null>(null);
  const [enabledDatasets, setEnabledDatasets] = useState<Set<string>>(
    new Set(datasets.map(d => d.id))
  );
  const [maxIncidents, setMaxIncidents] = useState(10);
  const [maxDepth, setMaxDepth] = useState(2);
  const [showStats, setShowStats] = useState(true);

  // Process graph data with enabled datasets
  const graphData = useMemo(() => {
    const activeDatasets = datasets.filter(d => enabledDatasets.has(d.id));
    
    // Override the config temporarily
    const originalMaxIncidents = MULTI_DATASET_CONFIG.maxIncidentsPerDataset;
    const originalMaxDepth = MULTI_DATASET_CONFIG.maxDepth;
    
    MULTI_DATASET_CONFIG.maxIncidentsPerDataset = maxIncidents === -1 ? Number.MAX_SAFE_INTEGER : maxIncidents;
    MULTI_DATASET_CONFIG.maxDepth = maxDepth === -1 ? Number.MAX_SAFE_INTEGER : maxDepth;
    
    const result = processMultiDatasetGraph(activeDatasets);
    
    // Restore original config
    MULTI_DATASET_CONFIG.maxIncidentsPerDataset = originalMaxIncidents;
    MULTI_DATASET_CONFIG.maxDepth = originalMaxDepth;
    
    return result;
  }, [datasets, enabledDatasets, maxIncidents, maxDepth]);

  const toggleDataset = (datasetId: string) => {
    setEnabledDatasets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
  };

  const handleNodeSelect = (node: MultiDatasetGraphNode | null) => {
    setSelectedNode(node);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Graph Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset toggles */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Active Datasets</Label>
            <div className="flex flex-wrap gap-2">
              {datasets.map(dataset => (
                <Button
                  key={dataset.id}
                  variant={enabledDatasets.has(dataset.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDataset(dataset.id)}
                  style={{
                    backgroundColor: enabledDatasets.has(dataset.id) 
                      ? dataset.color 
                      : undefined,
                    borderColor: dataset.color,
                    color: enabledDatasets.has(dataset.id) ? 'white' : dataset.color
                  }}
                >
                  {dataset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Max incidents and depth selects */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Max Incidents per Dataset
              </Label>
              <Select value={String(maxIncidents)} onValueChange={(value) => setMaxIncidents(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 incidents</SelectItem>
                  <SelectItem value="10">10 incidents</SelectItem>
                  <SelectItem value="15">15 incidents</SelectItem>
                  <SelectItem value="20">20 incidents</SelectItem>
                  <SelectItem value="25">25 incidents</SelectItem>
                  <SelectItem value="30">30 incidents</SelectItem>
                  <SelectItem value="50">50 incidents</SelectItem>
                  <SelectItem value="100">100 incidents</SelectItem>
                  <SelectItem value="-1">All incidents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Max depth select */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Relationship Depth
              </Label>
              <Select value={String(maxDepth)} onValueChange={(value) => setMaxDepth(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Incidents only</SelectItem>
                  <SelectItem value="1">Direct connections</SelectItem>
                  <SelectItem value="2">2 levels deep</SelectItem>
                  <SelectItem value="3">3 levels deep</SelectItem>
                  <SelectItem value="4">4 levels deep</SelectItem>
                  <SelectItem value="5">5 levels deep</SelectItem>
                  <SelectItem value="-1">Unlimited depth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Show stats toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-stats"
              checked={showStats}
              onCheckedChange={setShowStats}
            />
            <Label htmlFor="show-stats">Show Statistics</Label>
          </div>
        </CardContent>
      </Card>

      {/* Data Limits Statistics */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Data Limits
              {Object.values(graphData.stats.incidentStats.limited).some(v => v) && (
                <Badge variant="destructive" className="text-xs">
                  Data Limited
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Rendering Statistics */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Rendering Statistics
                  {maxDepth !== -1 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Depth: {maxDepth === 0 ? 'Incidents only' : `${maxDepth} level${maxDepth > 1 ? 's' : ''}`}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-700 dark:text-blue-300">Nodes</div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {graphData.stats.renderingStats.actualNodes} of{' '}
                      {graphData.stats.renderingStats.potentialNodes}
                      {graphData.stats.renderingStats.nodeReduction > 0 && (
                        <span className="text-xs ml-1 text-blue-600 dark:text-blue-400">
                          ({graphData.stats.renderingStats.nodeReduction}% reduction)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-700 dark:text-blue-300">Edges</div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {graphData.stats.renderingStats.actualEdges} of{' '}
                      {graphData.stats.renderingStats.potentialEdges}
                      {graphData.stats.renderingStats.edgeReduction > 0 && (
                        <span className="text-xs ml-1 text-blue-600 dark:text-blue-400">
                          ({graphData.stats.renderingStats.edgeReduction}% reduction)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Incident Limits */}
              {datasets.filter(d => enabledDatasets.has(d.id)).map(dataset => {
                const total = graphData.stats.incidentStats.totalAvailable[dataset.id] || 0;
                const displayed = graphData.stats.incidentStats.displayed[dataset.id] || 0;
                const percentage = total > 0 ? Math.round((displayed / total) * 100) : 100;
                const isLimited = graphData.stats.incidentStats.limited[dataset.id];
                
                return (
                  <div key={dataset.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dataset.color }}
                        />
                        <span className="text-sm font-medium">{dataset.name}</span>
                        {isLimited && (
                          <Badge variant="outline" className="text-xs">
                            Limited
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {displayed} of {total} incidents ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: dataset.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Total summary */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Object.values(graphData.stats.incidentStats.displayed).reduce((a, b) => a + b, 0)} of{' '}
                    {Object.values(graphData.stats.incidentStats.totalAvailable).reduce((a, b) => a + b, 0)} incidents
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph Statistics */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Graph Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {graphData.stats.totalNodes}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Nodes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {graphData.stats.totalEdges}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Edges</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {graphData.nodes.filter(n => n.datasets && n.datasets.length > 1).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Bridge Nodes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {graphData.stats.crossDatasetLinks}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cross-Dataset Links</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {Object.keys(graphData.stats.nodesByType).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entity Types</div>
              </div>
            </div>

            {/* Nodes by dataset */}
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Nodes by Dataset</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(graphData.stats.nodesByDataset).map(([datasetId, count]) => {
                  const dataset = datasets.find(d => d.id === datasetId);
                  return (
                    <Badge 
                      key={datasetId} 
                      variant="secondary"
                      style={{ 
                        backgroundColor: dataset?.color + '20',
                        borderColor: dataset?.color,
                        color: dataset?.color
                      }}
                    >
                      {dataset?.name || datasetId}: {count}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Top entity types */}
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Entity Types</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(graphData.stats.nodesByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <Badge key={type} variant="outline">
                      {type.split(':').pop()}: {count}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Multi-Dataset Graph Visualization
            {selectedNode && (
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                Selected: {selectedNode.label}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <MultiDatasetGraphRenderer
              nodes={graphData.nodes}
              edges={graphData.edges}
              width={800}
              height={600}
              onNodeSelect={handleNodeSelect}
              selectedNode={selectedNode}
            />
            
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Legend</div>
              <div className="space-y-1">
                {datasets.filter(d => enabledDatasets.has(d.id)).map(dataset => (
                  <div key={dataset.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dataset.color }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {dataset.name}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-zinc-700">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-300 to-gray-500" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full border-2 border-purple-600 border-dashed" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Bridge node (multi-dataset)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Label: </span>
                <span className="text-sm text-gray-900 dark:text-white">{selectedNode.label}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type: </span>
                <Badge variant="outline">{selectedNode.type}</Badge>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Datasets: </span>
                <div className="inline-flex gap-1">
                  {(selectedNode.datasets || [selectedNode.dataset]).map(datasetId => {
                    const dataset = datasets.find(d => d.id === datasetId);
                    return (
                      <Badge
                        key={datasetId}
                        style={{
                          backgroundColor: dataset?.color + '20',
                          borderColor: dataset?.color,
                          color: dataset?.color
                        }}
                      >
                        {dataset?.name || datasetId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connections: </span>
                <span className="text-sm text-gray-900 dark:text-white">{selectedNode.connectionCount || 0}</span>
              </div>
              {selectedNode.value && (
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raw Data:</div>
                  <pre className="text-xs bg-gray-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedNode.value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}