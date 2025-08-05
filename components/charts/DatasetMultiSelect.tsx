'use client';

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getMergeStatistics } from '@/lib/charts/datasetMerger';
import { NormalizationResult } from '@/lib/normalization';

interface Dataset {
  id: string;
  name: string;
  description: string;
  data: any;
}

interface DatasetMultiSelectProps {
  datasets: Record<string, Dataset>;
  normalizedDatasets: Record<string, NormalizationResult>;
  selectedDatasetIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export default function DatasetMultiSelect({
  datasets,
  normalizedDatasets,
  selectedDatasetIds,
  onSelectionChange
}: DatasetMultiSelectProps) {
  const handleCheckboxChange = (datasetId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDatasetIds, datasetId]);
    } else {
      onSelectionChange(selectedDatasetIds.filter(id => id !== datasetId));
    }
  };

  // Get merge statistics if multiple datasets selected
  const mergeStats = selectedDatasetIds.length > 1 
    ? getMergeStatistics(selectedDatasetIds, normalizedDatasets)
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {Object.entries(datasets).map(([id, dataset]) => {
          const normalizedData = normalizedDatasets[id];
          const entityCount = normalizedData 
            ? Object.values(normalizedData.extracted).reduce((sum, entities) => sum + entities.length, 0)
            : 0;

          return (
            <div key={id} className="flex items-start space-x-3">
              <Checkbox
                id={`dataset-${id}`}
                checked={selectedDatasetIds.includes(id)}
                onCheckedChange={(checked) => handleCheckboxChange(id, checked as boolean)}
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`dataset-${id}`} 
                  className="cursor-pointer"
                >
                  <div className="font-medium">{dataset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {dataset.description} • {entityCount.toLocaleString()} entities
                  </div>
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Merge Statistics */}
      {mergeStats && (
        <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <span className="text-muted-foreground">Merge:</span>
            <Badge variant="secondary" className="text-xs">
              {mergeStats.totalEntities}
            </Badge>
            <span>total</span>
            <span className="text-muted-foreground">•</span>
            <Badge variant="secondary" className="text-xs">
              {mergeStats.sharedEntities}
            </Badge>
            <span>shared</span>
          </div>
        </div>
      )}

      {selectedDatasetIds.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Select at least one dataset to continue
        </p>
      )}
    </div>
  );
}