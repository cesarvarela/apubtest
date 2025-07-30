'use client';

import { Badge } from "@/components/ui/badge";
import { Collapsible } from "@/components/ui/collapsible";
import { formatEntityTypeLabel, EntityTypeInfo } from '@/lib/charts/dynamicAnalyzer';
import { ChartBuilderState } from '@/lib/charts/types';

interface EntityTypeCardProps {
  entityTypes: EntityTypeInfo[];
  state: ChartBuilderState;
  onStateChange: (newState: ChartBuilderState) => void;
  defaultOpen?: boolean;
}

export default function EntityTypeCard({
  entityTypes,
  state,
  onStateChange,
  defaultOpen = true
}: EntityTypeCardProps) {
  const handleEntityTypeSelect = (entityType: string) => {
    onStateChange({
      ...state,
      selectedEntityType: entityType,
      // Reset dependent fields when entity type changes
      selectedGrouping: null,
      selectedDisplayField: null,
      selectedAggregation: 'count',
      selectedSort: 'count-desc',
      selectedResultsLimit: 20
    });
  };

  return (
    <Collapsible 
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
          What to Count
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Choose the type of entity you want to analyze and count.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entityTypes.map((entityType) => (
          <div
            key={entityType.type}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              state.selectedEntityType === entityType.type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleEntityTypeSelect(entityType.type)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{entityType.label}</h3>
              <Badge variant="secondary">{entityType.count}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">{entityType.type}</p>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}