'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Copy, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

import { normalizeEntities } from '@/lib/normalization';
import { discoverEntityTypes } from '@/lib/charts/dynamicAnalyzer';
import { ChartBuilderState, SavedChart, ChartResult } from '@/lib/charts/types';
import { exportChartToJSON, copyToClipboard, ExportedChartConfig, importChartFromJSON } from '@/lib/charts/exportImport';
import ChartRenderer from "@/components/charts/ChartRenderer";
import ChartBuilderModal from "@/components/charts/ChartBuilderModal";
import ChartImportModal from "@/components/charts/ChartImportModal";

import sampleData from '@/data/aiid-converted.json';

export default function ChartDashboardPage() {
  // Initialize with empty state to avoid hydration mismatch
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<SavedChart | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedConfig, setImportedConfig] = useState<{ title: string; builderState: Partial<ChartBuilderState> } | null>(null);

  // Load saved charts from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem('chartDashboard_savedCharts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const charts = parsed.map((chart: any) => ({
          ...chart,
          createdAt: new Date(chart.createdAt)
        }));
        setSavedCharts(charts);
      } catch (e) {
        console.error('Failed to parse saved charts:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist charts to localStorage whenever they change
  useEffect(() => {
    // Only persist after initial load is complete
    if (!isLoading) {
      localStorage.setItem('chartDashboard_savedCharts', JSON.stringify(savedCharts));
    }
  }, [savedCharts, isLoading]);

  // Normalize the sample data
  const normalizedData = useMemo(() => {
    return normalizeEntities(sampleData);
  }, []);

  // Discover all available entity types for overview
  const entityTypes = useMemo(() => {
    return discoverEntityTypes(normalizedData);
  }, [normalizedData]);

  const handleSaveChart = (chartResult: ChartResult, title: string, builderState: ChartBuilderState) => {
    if (editingChart) {
      // Update existing chart
      setSavedCharts(prev => prev.map(chart => 
        chart.id === editingChart.id 
          ? { 
              ...chart, 
              title, 
              chartResult, 
              chartType: builderState.selectedChartType,
              builderState 
            }
          : chart
      ));
      setEditingChart(null);
    } else {
      // Create new chart
      const newChart: SavedChart = {
        id: `chart-${Date.now()}`,
        title,
        chartResult,
        chartType: builderState.selectedChartType,
        createdAt: new Date(),
        builderState
      };
      setSavedCharts(prev => [...prev, newChart]);
    }
    
    setIsModalOpen(false);
  };

  const handleDeleteChart = (chartId: string) => {
    setSavedCharts(prev => prev.filter(chart => chart.id !== chartId));
  };

  const handleEditChart = (chart: SavedChart) => {
    setEditingChart(chart);
    setIsModalOpen(true);
  };

  const handleCopyJSON = async (chart: SavedChart) => {
    const exportedChart = exportChartToJSON(chart);
    const jsonString = JSON.stringify(exportedChart, null, 2);
    
    const success = await copyToClipboard(jsonString);
    if (success) {
      toast.success('Chart configuration copied to clipboard');
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleImportConfig = (config: ExportedChartConfig) => {
    const importedState = importChartFromJSON(config);
    setImportedConfig({
      title: config.title,
      builderState: importedState
    });
    setIsImportModalOpen(false);
    setIsModalOpen(true);
  };


  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-7xl space-y-8">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Chart Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Create and manage multiple charts from JSON-LD data. Build a custom dashboard with your visualizations.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsImportModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Chart
              </Button>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Chart
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        {isLoading ? (
          // Show loading state while checking localStorage
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="text-gray-600 dark:text-gray-400">
                  Loading charts...
                </div>
              </div>
            </CardContent>
          </Card>
        ) : savedCharts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    No charts yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Get started by creating your first chart visualization
                  </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                  Create Your First Chart
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {savedCharts.map((chart) => (
              <Card key={chart.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{chart.title}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyJSON(chart)}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy JSON</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditChart(chart)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteChart(chart.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                    <ChartRenderer 
                      data={chart.chartResult} 
                      chartType={chart.chartType}
                      className="dashboard-chart"
                    />
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>{chart.chartResult.metadata.totalEntities} entities</span>
                      <span>{chart.chartResult.metadata.uniqueGroups} groups</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Data Overview Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {entityTypes.map((entityType) => (
                <div key={entityType.type} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {entityType.count}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {entityType.label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Builder Modal */}
      <ChartBuilderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingChart(null);
          setImportedConfig(null);
        }}
        onSave={handleSaveChart}
        normalizedData={normalizedData}
        editingChart={editingChart}
        importedConfig={importedConfig}
      />

      {/* Chart Import Modal */}
      <ChartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportConfig}
      />
    </main>
  );
}