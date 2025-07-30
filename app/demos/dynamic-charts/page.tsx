'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { normalizeEntities } from '@/lib/normalization';
import { discoverEntityTypes, formatEntityTypeLabel } from '@/lib/charts/dynamicAnalyzer';
import { ChartBuilderState } from '@/lib/charts/types';
import ChartBuilder from '@/components/charts/ChartBuilder';

// import sampleData from '@/data/sample-aiid-converted.json';
import sampleData from '@/data/aiid-converted.json';

export default function DynamicChartsPage() {
  const [chartState, setChartState] = useState<ChartBuilderState>({
    selectedEntityType: null,
    selectedGrouping: null,
    selectedDisplayField: null,
    selectedAggregation: 'count',
    selectedSort: 'count-desc',
    selectedResultsLimit: 20,
    selectedChartType: 'bar'
  });

  // Normalize the sample data
  const normalizedData = useMemo(() => {
    return normalizeEntities(sampleData);
  }, []);

  // Discover all available entity types for the sidebar
  const entityTypes = useMemo(() => {
    return discoverEntityTypes(normalizedData);
  }, [normalizedData]);

  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-6xl space-y-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dynamic Chart Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create charts from any JSON-LD data. Select what to count, how to group it, and what type of chart to display.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Chart Builder */}
          <div className="lg:col-span-2">
            <ChartBuilder
              normalizedData={normalizedData}
              state={chartState}
              onStateChange={setChartState}
              defaultOpenStates={{
                entityType: true,
                grouping: false,
                displayField: false,
                configuration: false,
                preview: false
              }}
            />
          </div>

          {/* Sidebar - Configuration Summary */}
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
              </CardContent>
            </Card>

            {/* Data Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entityTypes.map((entityType) => (
                  <div key={entityType.type} className="flex items-center justify-between text-sm">
                    <span>{entityType.label}</span>
                    <Badge variant="outline">{entityType.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}