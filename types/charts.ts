// Chart configuration types using measure/dimension model

export interface ChartMeasure {
  entity: string;                      // Entity to measure (e.g., 'aiid:Incident')
  aggregation: 'count' | 'sum' | 'avg' | 'cumulative';
  field?: string;                      // Optional: specific field to aggregate
}

export interface ChartDimension {
  entity: string;                      // Entity to group by (e.g., 'core:Organization')
  field: string;                       // Display field (e.g., 'name', 'title', 'date')
  via?: string;                        // Relationship path (e.g., 'deployedBy', 'affectedParties')
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  measure: ChartMeasure;
  dimension: ChartDimension;
  sortBy: 'measure' | 'dimension';
  sortOrder: 'asc' | 'desc';
  topN?: number;
}

export interface ChartData {
  data: Array<{ [key: string]: any }>;
  measureLabel: string;
  dimensionLabel: string;
}

// Schema analysis types
export interface SchemaProperty {
  key: string;
  label: string;
  uri: string;
  type: 'string' | 'date' | 'number' | 'object' | 'array';
  isRelation: boolean;
}

// Chart template types
export interface ChartTemplate {
  id: string;
  title: string;
  description: string;
  category: 'organizations' | 'trends' | 'impact' | 'content';
  icon: string;
  config: ChartConfig;
  variations?: ChartTemplate[];
}