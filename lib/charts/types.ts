import { FieldInfo } from './dynamicAnalyzer';
import { EntityReference } from '../normalization';

// Central chart type definition used by all components
export type ChartType = 'bar' | 'horizontal-bar' | 'pie' | 'donut' | 'line';

// Chart result types (moved from chartDataExtractor)
export interface ChartDataPoint {
  label: string;
  value: number;
  count: number; // Number of entities that contributed to this data point
  entities: EntityReference[]; // References to contributing entities
}

export interface ChartResult {
  data: ChartDataPoint[];
  config: {
    sourceType: string;
    groupBy: string;
    groupByFieldType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'reference';
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'cumulative';
    groupByLabelField?: string;
    targetTypeFilter?: string;
    sortBy?: 'count-desc' | 'count-asc' | 'alpha-asc' | 'alpha-desc' | 'chrono-asc' | 'chrono-desc';
  };
  metadata: {
    totalEntities: number;
    uniqueGroups: number;
    sourceEntityType: string;
    targetEntityType?: string;
  };
}

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
  datasetId?: string; // Deprecated - use datasetIds instead
  datasetIds?: string[]; // New field supporting multiple datasets
}

export interface DefaultOpenStates {
  entityType?: boolean;
  grouping?: boolean;
  displayField?: boolean;
  configuration?: boolean;
  preview?: boolean;
}