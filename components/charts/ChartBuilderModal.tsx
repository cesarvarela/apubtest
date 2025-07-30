'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { NormalizationResult } from '@/lib/normalization';
import { formatEntityTypeLabel } from '@/lib/charts/dynamicAnalyzer';
import { ChartResult } from '@/lib/charts/chartDataExtractor';
import { generateChartTitle } from '@/lib/charts/labelGenerator';
import { ChartBuilderState, SavedChart } from '@/lib/charts/types';
import ChartBuilder from './ChartBuilder';

interface ChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chartResult: ChartResult, title: string, builderState: ChartBuilderState) => void;
  normalizedData: NormalizationResult;
  editingChart?: SavedChart | null;
}

export default function ChartBuilderModal({ 
  isOpen, 
  onClose, 
  onSave, 
  normalizedData,
  editingChart 
}: ChartBuilderModalProps) {
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

  // Initialize state when editing a chart
  useEffect(() => {
    if (editingChart) {
      setChartState(editingChart.builderState);
      setChartTitle(editingChart.title);
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
    }
  }, [editingChart, isOpen]);

  // Auto-generate title when chart result is available (for new charts only)
  useEffect(() => {
    if (chartResult && chartState.selectedEntityType && chartState.selectedGrouping && !editingChart) {
      const autoTitle = generateChartTitle(
        chartState.selectedEntityType, 
        chartState.selectedGrouping.fieldName, 
        chartState.selectedGrouping.targetTypes
      );
      setChartTitle(autoTitle);
    }
  }, [chartResult, chartState.selectedEntityType, chartState.selectedGrouping, editingChart]);

  const handleSave = () => {
    if (chartResult && chartTitle.trim()) {
      onSave(chartResult, chartTitle.trim(), chartState);
      handleClose();
    }
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {editingChart ? 'Edit Chart' : 'Create New Chart'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content - Chart Builder */}
          <div className="xl:col-span-3">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">What to Count</label>
                  <p className="text-sm">{chartState.selectedEntityType ? formatEntityTypeLabel(chartState.selectedEntityType) : 'Not selected'}</p>
                </div>
                
                {chartState.selectedGrouping && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grouped By</label>
                      <p className="text-sm">{chartState.selectedGrouping.description}</p>
                    </div>
                  </>
                )}
                
                {chartState.selectedChartType && chartState.selectedGrouping && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chart Type</label>
                      <p className="text-sm capitalize">{chartState.selectedChartType.replace('-', ' ')}</p>
                    </div>
                  </>
                )}

                {chartResult && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="chart-title">Chart Title</Label>
                      <Input
                        id="chart-title"
                        value={chartTitle}
                        onChange={(e) => setChartTitle(e.target.value)}
                        placeholder="Enter chart title..."
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
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