import { FieldInfo } from './dynamicAnalyzer';
import { ChartResult } from './chartDataExtractor';

// Central chart type definition used by all components
export type ChartType = 'bar' | 'horizontal-bar' | 'pie' | 'donut' | 'line';

export interface GroupingOption {
  fieldName: string;
  label: string;
  description: string;
  targetTypes: string[];
  frequency: number;
  availableDisplayFields?: FieldInfo[];
  fieldType?: FieldInfo['type']; // Field type for smart sorting
}

export interface ChartBuilderState {
  selectedEntityType: string | null;
  selectedGrouping: GroupingOption | null;
  selectedDisplayField: string | null;
  selectedAggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'cumulative';
  selectedSort: 'count-desc' | 'count-asc' | 'alpha-asc' | 'alpha-desc' | 'chrono-asc' | 'chrono-desc';
  selectedResultsLimit: 10 | 20 | 50 | 100 | 'all';
  selectedChartType: ChartType;
}

export interface SavedChart {
  id: string;
  title: string;
  chartResult: ChartResult;
  chartType: ChartType;
  createdAt: Date;
  builderState: ChartBuilderState;
}

export interface DefaultOpenStates {
  entityType?: boolean;
  grouping?: boolean;
  displayField?: boolean;
  configuration?: boolean;
  preview?: boolean;
}