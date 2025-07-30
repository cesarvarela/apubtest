'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityTypeInfo } from '@/lib/charts/dynamicAnalyzer';

interface EntityTypeSelectorProps {
  entityTypes: EntityTypeInfo[];
  selectedEntityType: string | null;
  onSelect: (entityType: string) => void;
}

export default function EntityTypeSelector({ 
  entityTypes, 
  selectedEntityType, 
  onSelect 
}: EntityTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
          What to Count
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose the type of entity you want to analyze and count.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entityTypes.map((entityType) => (
            <div
              key={entityType.type}
              className={`p-4 border rounded-lg cursor-pointer transition-colors min-w-0 ${
                selectedEntityType === entityType.type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(entityType.type)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium truncate flex-1">{entityType.label}</h3>
                <Badge variant="secondary" className="flex-shrink-0">{entityType.count}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{entityType.type}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}