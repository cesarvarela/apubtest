'use client';

import { Badge } from "@/components/ui/badge";
import { Collapsible } from "@/components/ui/collapsible";
import { formatEntityTypeLabel } from '@/lib/charts/dynamicAnalyzer';
import { ChartBuilderState } from '@/lib/charts/types';

interface DisplayFieldCardProps {
  state: ChartBuilderState;
  onStateChange: (newState: ChartBuilderState) => void;
  defaultOpen?: boolean;
}

export default function DisplayFieldCard({
  state,
  onStateChange,
  defaultOpen = false
}: DisplayFieldCardProps) {
  const handleDisplayFieldSelect = (fieldName: string) => {
    onStateChange({
      ...state,
      selectedDisplayField: fieldName
    });
  };

  // Only show if we have a grouping with available display fields
  if (!state.selectedEntityType || 
      !state.selectedGrouping || 
      !state.selectedGrouping.availableDisplayFields || 
      state.selectedGrouping.availableDisplayFields.length === 0) {
    return null;
  }

  return (
    <Collapsible 
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
          Display Field
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Choose which field to display in the chart for {state.selectedGrouping.targetTypes.map(formatEntityTypeLabel).join(', ').toLowerCase()}.
      </p>
      <div className="space-y-3">
        {state.selectedGrouping.availableDisplayFields.slice(0, 6).map((field) => (
          <div
            key={field.fieldName}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              state.selectedDisplayField === field.fieldName
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleDisplayFieldSelect(field.fieldName)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium capitalize">{field.fieldName}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {field.sampleValues.slice(0, 3).join(', ')}
                  {field.sampleValues.length > 3 && '...'}
                </p>
              </div>
              <Badge variant="outline" className="ml-2">
                {Math.round(field.frequency * 100)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}