'use client';

import { Collapsible } from "@/components/ui/collapsible";
import SimpleChart from "./SimpleChart";
import { ChartResult } from '@/lib/charts/chartDataExtractor';
import { generateChartTitle, formatChartAxisLabel } from '@/lib/charts/labelGenerator';
import { ChartBuilderState } from '@/lib/charts/types';

interface ChartPreviewCardProps {
  chartResult: ChartResult | null;
  state: ChartBuilderState;
  defaultOpen?: boolean;
}

export default function ChartPreviewCard({
  chartResult,
  state,
  defaultOpen = false
}: ChartPreviewCardProps) {
  if (!state.selectedEntityType || !state.selectedGrouping || !chartResult) {
    return null;
  }

  return (
    <Collapsible 
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
          Chart Preview
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <div className="space-y-6">
        {/* Chart metadata */}
        <div>
          <h3 className="text-lg font-medium">
            {generateChartTitle(state.selectedEntityType, state.selectedGrouping.fieldName, state.selectedGrouping.targetTypes)}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Found {chartResult.metadata.totalEntities} entities with {chartResult.metadata.uniqueGroups} unique groups
          </p>
        </div>
        
        {/* Chart Visualization */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
          <SimpleChart 
            data={chartResult} 
            chartType={state.selectedChartType}
            resultsLimit={state.selectedResultsLimit}
          />
        </div>
        
        {/* Collapsible Debug Data */}
        <Collapsible title="Debug Data" className="mt-4">
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">
              Raw data for debugging and analysis
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
                <div className="grid grid-cols-4 gap-4 font-medium text-sm">
                  <div>Group</div>
                  <div>{formatChartAxisLabel('count', state.selectedEntityType)}</div>
                  <div>Count</div>
                  <div>Percentage</div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {chartResult.data.map((dataPoint, index) => {
                  const percentage = Math.round((dataPoint.count / chartResult.metadata.totalEntities) * 100);
                  return (
                    <div key={index} className="px-4 py-2 border-b last:border-b-0 text-xs">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="font-medium truncate" title={dataPoint.label}>
                          {dataPoint.label}
                        </div>
                        <div>{dataPoint.value}</div>
                        <div className="text-gray-600 dark:text-gray-400">{dataPoint.count}</div>
                        <div className="text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Additional debug info */}
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <div><strong>Source Type:</strong> {chartResult.config.sourceType}</div>
              <div><strong>Group By:</strong> {chartResult.config.groupBy}</div>
              <div><strong>Aggregation:</strong> {chartResult.config.aggregation}</div>
              {chartResult.config.groupByLabelField && (
                <div><strong>Label Field:</strong> {chartResult.config.groupByLabelField}</div>
              )}
              {chartResult.config.relationshipPath && chartResult.config.relationshipPath.length > 0 && (
                <div><strong>Relationship Path:</strong> {chartResult.config.relationshipPath.join(' → ')}</div>
              )}
            </div>
          </div>
        </Collapsible>
      </div>
    </Collapsible>
  );
}