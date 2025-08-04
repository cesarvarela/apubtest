'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { NormalizationResult } from '@/lib/normalization';
import { formatEntityTypeLabel } from '@/lib/charts/dynamicAnalyzer';
import { generateChartTitle } from '@/lib/charts/labelGenerator';
import { ChartBuilderState, SavedChart, ChartResult } from '@/lib/charts/types';
import ChartBuilder from './ChartBuilder';

interface Dataset {
  id: string;
  name: string;
  description: string;
  data: any;
}

interface ChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chartResult: ChartResult, title: string, builderState: ChartBuilderState, datasetId: string) => void;
  datasets: Record<string, Dataset>;
  normalizedDatasets: Record<string, NormalizationResult>;
  editingChart?: SavedChart | null;
  importedConfig?: {
    title: string;
    builderState: Partial<ChartBuilderState>;
  } | null;
}

export default function ChartBuilderModal({ 
  isOpen, 
  onClose, 
  onSave, 
  datasets,
  normalizedDatasets,
  editingChart,
  importedConfig
}: ChartBuilderModalProps) {
  // Default to the first dataset or the one from editing chart
  const defaultDatasetId = editingChart?.datasetId || Object.keys(datasets)[0];
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDatasetId);
  const [chartState, setChartState] = useState<ChartBuilderState>({
    selectedEntityType: null,
    selectedGrouping: null,
    selectedDisplayField: null,
    selectedAggregation: 'count',
    selectedSort: 'count-desc',
    selectedResultsLimit: 20,
    selectedChartType: 'bar'
  });
  const [chartTitle, setChartTitle] = useState<string>('');
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);

  // Get the normalized data for the selected dataset
  const normalizedData = normalizedDatasets[selectedDatasetId];

  // Initialize state when editing a chart or importing
  useEffect(() => {
    if (editingChart) {
      setChartState(editingChart.builderState);
      setChartTitle(editingChart.title);
      if (editingChart.datasetId) {
        setSelectedDatasetId(editingChart.datasetId);
      }
    } else if (importedConfig) {
      // Merge imported config with defaults
      setChartState({
        selectedEntityType: importedConfig.builderState.selectedEntityType || null,
        selectedGrouping: importedConfig.builderState.selectedGrouping || null,
        selectedDisplayField: importedConfig.builderState.selectedDisplayField || null,
        selectedAggregation: importedConfig.builderState.selectedAggregation || 'count',
        selectedSort: importedConfig.builderState.selectedSort || 'count-desc',
        selectedResultsLimit: importedConfig.builderState.selectedResultsLimit || 20,
        selectedChartType: importedConfig.builderState.selectedChartType || 'bar'
      });
      setChartTitle(importedConfig.title);
    } else {
      // Reset to defaults when creating new chart
      setChartState({
        selectedEntityType: null,
        selectedGrouping: null,
        selectedDisplayField: null,
        selectedAggregation: 'count',
        selectedSort: 'count-desc',
        selectedResultsLimit: 20,
        selectedChartType: 'bar'
      });
      setChartTitle('');
      setSelectedDatasetId(Object.keys(datasets)[0]);
    }
  }, [editingChart, importedConfig, isOpen, datasets]);

  // Auto-generate title when chart result is available (for new charts only, not imported)
  useEffect(() => {
    if (chartResult && chartState.selectedEntityType && chartState.selectedGrouping && !editingChart && !importedConfig) {
      const autoTitle = generateChartTitle(
        chartState.selectedEntityType, 
        chartState.selectedGrouping.fieldName, 
        chartState.selectedGrouping.targetTypes
      );
      setChartTitle(autoTitle);
    }
  }, [chartResult, chartState.selectedEntityType, chartState.selectedGrouping, editingChart, importedConfig]);

  const handleSave = () => {
    if (chartResult && chartTitle.trim()) {
      onSave(chartResult, chartTitle.trim(), chartState, selectedDatasetId);
      handleClose();
    }
  };

  const handleDatasetChange = (newDatasetId: string) => {
    setSelectedDatasetId(newDatasetId);
    // Reset chart state when changing dataset
    setChartState({
      selectedEntityType: null,
      selectedGrouping: null,
      selectedDisplayField: null,
      selectedAggregation: 'count',
      selectedSort: 'count-desc',
      selectedResultsLimit: 20,
      selectedChartType: 'bar'
    });
    setChartResult(null);
  };

  const handleClose = () => {
    // Reset form
    setChartState({
      selectedEntityType: null,
      selectedGrouping: null,
      selectedDisplayField: null,
      selectedAggregation: 'count',
      selectedSort: 'count-desc',
      selectedResultsLimit: 20,
      selectedChartType: 'bar'
    });
    setChartTitle('');
    setChartResult(null);
    onClose();
  };

  const canSave = chartResult && chartTitle.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingChart ? 'Edit Chart' : importedConfig ? 'Import Chart' : 'Create New Chart'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {/* Dataset Selection - Only show when creating new chart */}
          {!editingChart && (
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Dataset</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedDatasetId} onValueChange={handleDatasetChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(datasets).map(([id, dataset]) => (
                        <SelectItem key={id} value={id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{dataset.name}</span>
                            <span className="text-xs text-muted-foreground">{dataset.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content - Chart Builder */}
            <div className="lg:col-span-3">
              <ChartBuilder
                normalizedData={normalizedData}
                state={chartState}
                onStateChange={setChartState}
                onChartResult={setChartResult}
                defaultOpenStates={{
                  entityType: true,
                  grouping: true,
                  displayField: true,
                  configuration: true,
                  preview: true
                }}
              />
            </div>

            {/* Sidebar - Configuration Summary and Title */}
            <div className="lg:col-span-1">
              <Card className="sticky top-0">
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dataset</label>
                    <p className="mt-1">{datasets[selectedDatasetId].name}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What to Count</label>
                    <p className="mt-1">{chartState.selectedEntityType ? formatEntityTypeLabel(chartState.selectedEntityType) : 'Not selected'}</p>
                  </div>
                  
                  {chartState.selectedGrouping && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grouped By</label>
                        <p className="mt-1">{chartState.selectedGrouping.description}</p>
                      </div>
                    </>
                  )}
                  
                  {chartState.selectedChartType && chartState.selectedGrouping && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chart Type</label>
                        <p className="mt-1 capitalize">{chartState.selectedChartType.replace('-', ' ')}</p>
                      </div>
                    </>
                  )}

                  {chartResult && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="chart-title" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chart Title</Label>
                        <Input
                          id="chart-title"
                          value={chartTitle}
                          onChange={(e) => setChartTitle(e.target.value)}
                          placeholder="Enter chart title..."
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave}
          >
            {editingChart ? 'Save Changes' : 'Save Chart'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}