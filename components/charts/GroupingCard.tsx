'use client';

import { Badge } from "@/components/ui/badge";
import { Collapsible } from "@/components/ui/collapsible";
import { formatEntityTypeLabel } from '@/lib/charts/dynamicAnalyzer';
import { ChartBuilderState, GroupingOption } from '@/lib/charts/types';

interface GroupingCardProps {
  groupingOptions: GroupingOption[];
  state: ChartBuilderState;
  onStateChange: (newState: ChartBuilderState) => void;
  defaultOpen?: boolean;
}

export default function GroupingCard({
  groupingOptions,
  state,
  onStateChange,
  defaultOpen = false
}: GroupingCardProps) {
  const handleGroupingSelect = (option: GroupingOption) => {
    onStateChange({
      ...state,
      selectedGrouping: option,
      // Reset dependent fields when grouping changes
      selectedDisplayField: null,
      selectedAggregation: 'count',
      selectedSort: 'count-desc',
      selectedResultsLimit: 20
    });
  };

  if (!state.selectedEntityType) {
    return null;
  }

  return (
    <Collapsible 
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
          Grouped By
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Choose how to group your {formatEntityTypeLabel(state.selectedEntityType).toLowerCase()}.
      </p>
      <div className="space-y-3">
        {groupingOptions.map((option, index) => (
          <div
            key={`${option.fieldName}-${option.targetTypes.join(',')}-${index}`}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              state.selectedGrouping?.fieldName === option.fieldName && 
              JSON.stringify(state.selectedGrouping?.targetTypes) === JSON.stringify(option.targetTypes)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleGroupingSelect(option)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{option.description}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {option.label}
                </p>
                {option.targetTypes.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {option.targetTypes.map(formatEntityTypeLabel).join(', ')}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="ml-2">
                {Math.round(option.frequency * 100)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}