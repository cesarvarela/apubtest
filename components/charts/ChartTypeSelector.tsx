'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartType } from '@/lib/charts/types';

interface ChartTypeOption {
  type: ChartType;
  label: string;
  icon: string;
  description: string;
}

interface ChartTypeSelectorProps {
  selectedChartType: ChartType;
  onSelect: (chartType: ChartType) => void;
}

const chartTypeOptions: ChartTypeOption[] = [
  { type: 'bar', label: 'Bar Chart', icon: '📊', description: 'Vertical bars' },
  { type: 'horizontal-bar', label: 'Horizontal Bar', icon: '📈', description: 'Horizontal bars' },
  { type: 'pie', label: 'Pie Chart', icon: '🥧', description: 'Circular segments' },
  { type: 'donut', label: 'Donut Chart', icon: '🍩', description: 'Ring segments' },
  { type: 'line', label: 'Line Chart', icon: '📉', description: 'Connected points' }
];

export default function ChartTypeSelector({ 
  selectedChartType, 
  onSelect 
}: ChartTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
          Chart Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose how to visualize your data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {chartTypeOptions.map((chartType) => (
            <div
              key={chartType.type}
              className={`p-4 border rounded-lg cursor-pointer transition-colors text-center ${
                selectedChartType === chartType.type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(chartType.type)}
            >
              <div className="text-2xl mb-2">{chartType.icon}</div>
              <h4 className="font-medium text-sm">{chartType.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{chartType.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}