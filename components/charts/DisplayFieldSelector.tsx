'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEntityTypeLabel, FieldInfo } from '@/lib/charts/dynamicAnalyzer';

interface GroupingOption {
  fieldName: string;
  label: string;
  description: string;
  targetTypes: string[];
  frequency: number;
  availableDisplayFields?: FieldInfo[];
  fieldType?: FieldInfo['type'];
}

interface DisplayFieldSelectorProps {
  selectedGrouping: GroupingOption;
  selectedDisplayField: string | null;
  onSelect: (fieldName: string) => void;
}

export default function DisplayFieldSelector({ 
  selectedGrouping,
  selectedDisplayField, 
  onSelect 
}: DisplayFieldSelectorProps) {
  // Only show if there are available display fields
  if (!selectedGrouping.availableDisplayFields || selectedGrouping.availableDisplayFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
          Display Field
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose which field to display in the chart for {selectedGrouping.targetTypes.map(formatEntityTypeLabel).join(', ').toLowerCase()}.
        </p>
        <div className="space-y-3">
          {selectedGrouping.availableDisplayFields.slice(0, 6).map((field) => (
            <div
              key={field.fieldName}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedDisplayField === field.fieldName
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(field.fieldName)}
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
      </CardContent>
    </Card>
  );
}