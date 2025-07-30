'use client';

import { Collapsible } from "@/components/ui/collapsible";
import { ChartBuilderState, ChartType } from '@/lib/charts/types';

interface ChartConfigurationCardProps {
  state: ChartBuilderState;
  onStateChange: (newState: ChartBuilderState) => void;
  defaultOpen?: boolean;
}

const chartTypeOptions = [
  { type: 'bar' as ChartType, label: 'Bar Chart', icon: '📊', description: 'Vertical bars' },
  { type: 'horizontal-bar' as ChartType, label: 'Horizontal Bar', icon: '📈', description: 'Horizontal bars' },
  { type: 'pie' as ChartType, label: 'Pie Chart', icon: '🥧', description: 'Circular segments' },
  { type: 'donut' as ChartType, label: 'Donut Chart', icon: '🍩', description: 'Ring segments' },
  { type: 'line' as ChartType, label: 'Line Chart', icon: '📉', description: 'Connected points' }
];

export default function ChartConfigurationCard({
  state,
  onStateChange,
  defaultOpen = false
}: ChartConfigurationCardProps) {
  if (!state.selectedEntityType || !state.selectedGrouping) {
    return null;
  }

  const updateState = (updates: Partial<ChartBuilderState>) => {
    onStateChange({ ...state, ...updates });
  };

  return (
    <Collapsible 
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
          Chart Configuration
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <div className="space-y-6">
        {/* Aggregation Section */}
        <Collapsible 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Aggregation Method</span>
              <span className="text-xs text-gray-500 capitalize">
                {(() => {
                  const agg = [
                    { type: 'count', label: 'Count' },
                    { type: 'cumulative', label: 'Cumulative' },
                    { type: 'sum', label: 'Sum' },
                    { type: 'avg', label: 'Average' },
                    { type: 'min', label: 'Minimum' },
                    { type: 'max', label: 'Maximum' }
                  ].find(a => a.type === state.selectedAggregation);
                  return agg?.label || 'Count';
                })()}
              </span>
            </div>
          }
          defaultOpen={false}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose how to calculate values for each group.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { type: 'count', label: 'Count', description: 'Number of items' },
              { type: 'cumulative', label: 'Cumulative', description: 'Running total' },
              { type: 'sum', label: 'Sum', description: 'Total of values' },
              { type: 'avg', label: 'Average', description: 'Mean value' },
              { type: 'min', label: 'Minimum', description: 'Lowest value' },
              { type: 'max', label: 'Maximum', description: 'Highest value' }
            ].map((agg) => (
              <div
                key={agg.type}
                className={`p-3 border rounded-lg cursor-pointer transition-colors text-center ${
                  state.selectedAggregation === agg.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => updateState({ selectedAggregation: agg.type as any })}
              >
                <h4 className="font-medium text-sm">{agg.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{agg.description}</p>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Sort Section */}
        <Collapsible 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Sort Order</span>
              <span className="text-xs text-gray-500">
                {(() => {
                  const sort = [
                    { type: 'count-desc', label: 'Count (High → Low)' },
                    { type: 'count-asc', label: 'Count (Low → High)' },
                    { type: 'alpha-asc', label: 'Alphabetical (A → Z)' },
                    { type: 'alpha-desc', label: 'Alphabetical (Z → A)' },
                    { type: 'chrono-asc', label: 'Chronological (Old → New)' },
                    { type: 'chrono-desc', label: 'Chronological (New → Old)' }
                  ].find(s => s.type === state.selectedSort);
                  return sort?.label || 'Count (High → Low)';
                })()}
              </span>
            </div>
          }
          defaultOpen={false}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose how to order the results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { type: 'count-desc', label: 'Count (High → Low)', description: 'Most frequent first' },
              { type: 'count-asc', label: 'Count (Low → High)', description: 'Least frequent first' },
              { type: 'alpha-asc', label: 'Alphabetical (A → Z)', description: 'Ascending order' },
              { type: 'alpha-desc', label: 'Alphabetical (Z → A)', description: 'Descending order' },
              ...(state.selectedGrouping?.fieldType === 'date' ? [
                { type: 'chrono-asc', label: 'Chronological (Old → New)', description: 'Earliest first' },
                { type: 'chrono-desc', label: 'Chronological (New → Old)', description: 'Latest first' }
              ] : [])
            ].map((sort) => (
              <div
                key={sort.type}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  state.selectedSort === sort.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => updateState({ selectedSort: sort.type as any })}
              >
                <h4 className="font-medium text-sm">{sort.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{sort.description}</p>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Results Limit Section */}
        <Collapsible 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Results Limit</span>
              <span className="text-xs text-gray-500">
                {(() => {
                  const limit = [
                    { type: 10, label: 'Top 10' },
                    { type: 20, label: 'Top 20' },
                    { type: 50, label: 'Top 50' },
                    { type: 100, label: 'Top 100' },
                    { type: 'all', label: 'Show All' }
                  ].find(l => l.type === state.selectedResultsLimit);
                  return limit?.label || 'Top 20';
                })()}
              </span>
            </div>
          }
          defaultOpen={false}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose how many results to display in the chart.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { type: 10 as const, label: 'Top 10', description: 'Show 10 results' },
              { type: 20 as const, label: 'Top 20', description: 'Show 20 results' },
              { type: 50 as const, label: 'Top 50', description: 'Show 50 results' },
              { type: 100 as const, label: 'Top 100', description: 'Show 100 results' },
              { type: 'all' as const, label: 'Show All', description: 'Show all results' },
            ].map((limit) => (
              <div
                key={limit.type}
                className={`p-3 border rounded-lg cursor-pointer transition-colors text-center ${
                  state.selectedResultsLimit === limit.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => updateState({ selectedResultsLimit: limit.type })}
              >
                <h4 className="font-medium text-sm">{limit.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{limit.description}</p>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Chart Type Section */}
        <Collapsible 
          title={
            <div className="flex items-center justify-between w-full">
              <span>Chart Type</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                {(() => {
                  const chartType = chartTypeOptions.find(ct => ct.type === state.selectedChartType);
                  return (
                    <>
                      <span>{chartType?.icon}</span>
                      <span>{chartType?.label || 'Bar Chart'}</span>
                    </>
                  );
                })()}
              </span>
            </div>
          }
          defaultOpen={false}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose how to visualize your data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {chartTypeOptions.map((chartType) => (
              <div
                key={chartType.type}
                className={`p-4 border rounded-lg cursor-pointer transition-colors text-center ${
                  state.selectedChartType === chartType.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => updateState({ selectedChartType: chartType.type })}
              >
                <div className="text-2xl mb-2">{chartType.icon}</div>
                <h4 className="font-medium text-sm">{chartType.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{chartType.description}</p>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>
    </Collapsible>
  );
}