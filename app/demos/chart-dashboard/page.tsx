'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit } from "lucide-react";

import { normalizeEntities } from '@/lib/normalization';
import { discoverEntityTypes } from '@/lib/charts/dynamicAnalyzer';
import { ChartResult } from '@/lib/charts/chartDataExtractor';
import { ChartBuilderState, SavedChart } from '@/lib/charts/types';
import SimpleChart from "@/components/charts/SimpleChart";
import ChartBuilderModal from "@/components/charts/ChartBuilderModal";

// import sampleData from '@/data/sample-aiid-converted.json';
import sampleData from '@/data/aiid-converted.json';

export default function ChartDashboardPage() {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<SavedChart | null>(null);

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
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Chart
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        {savedCharts.length === 0 ? (
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
                      <p className="text-sm text-gray-500 mt-1">
                        Created {chart.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditChart(chart)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChart(chart.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                    <SimpleChart 
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
        }}
        onSave={handleSaveChart}
        normalizedData={normalizedData}
        editingChart={editingChart}
      />
    </main>
  );
}