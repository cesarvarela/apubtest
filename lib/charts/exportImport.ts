import { SavedChart, ChartBuilderState, ChartType } from './types';

export interface ExportedChartConfig {
  version: '1.0';
  title: string;
  chartType: string;
  builderState: SavedChart['builderState'];
  exportedAt: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
  data?: ExportedChartConfig;
}

export function exportChartToJSON(chart: SavedChart): ExportedChartConfig {
  return {
    version: '1.0',
    title: chart.title,
    chartType: chart.chartType,
    builderState: chart.builderState,
    exportedAt: new Date().toISOString()
  };
}

const VALID_CHART_TYPES: ChartType[] = ['bar', 'horizontal-bar', 'pie', 'donut', 'line'];
const VALID_AGGREGATIONS = ['count', 'sum', 'avg', 'min', 'max', 'cumulative'] as const;
const VALID_SORT_OPTIONS = ['count-desc', 'count-asc', 'alpha-asc', 'alpha-desc', 'chrono-asc', 'chrono-desc'] as const;
const VALID_RESULT_LIMITS = [10, 20, 50, 100, 'all'] as const;

export function validateChartConfig(jsonString: string): ImportValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check version
    if (!parsed.version || parsed.version !== '1.0') {
      return { isValid: false, error: 'Invalid or unsupported version' };
    }
    
    // Check required fields
    if (!parsed.title || typeof parsed.title !== 'string') {
      return { isValid: false, error: 'Missing or invalid title' };
    }
    
    if (!parsed.chartType || !VALID_CHART_TYPES.includes(parsed.chartType)) {
      return { isValid: false, error: 'Invalid chart type' };
    }
    
    if (!parsed.builderState || typeof parsed.builderState !== 'object') {
      return { isValid: false, error: 'Missing or invalid builder state' };
    }
    
    // Validate builder state
    const state = parsed.builderState;
    
    if (!state.selectedEntityType || typeof state.selectedEntityType !== 'string') {
      return { isValid: false, error: 'Missing or invalid entity type' };
    }
    
    if (!state.selectedGrouping || typeof state.selectedGrouping !== 'object') {
      return { isValid: false, error: 'Missing or invalid grouping configuration' };
    }
    
    if (!state.selectedGrouping.fieldName || !state.selectedGrouping.targetTypes) {
      return { isValid: false, error: 'Invalid grouping configuration' };
    }
    
    if (!VALID_AGGREGATIONS.includes(state.selectedAggregation)) {
      return { isValid: false, error: 'Invalid aggregation type' };
    }
    
    if (!VALID_SORT_OPTIONS.includes(state.selectedSort)) {
      return { isValid: false, error: 'Invalid sort option' };
    }
    
    if (!VALID_RESULT_LIMITS.includes(state.selectedResultsLimit)) {
      return { isValid: false, error: 'Invalid results limit' };
    }
    
    if (!VALID_CHART_TYPES.includes(state.selectedChartType)) {
      return { isValid: false, error: 'Invalid chart type in builder state' };
    }
    
    return { isValid: true, data: parsed as ExportedChartConfig };
  } catch {
    return { isValid: false, error: 'Invalid JSON format' };
  }
}

export function importChartFromJSON(config: ExportedChartConfig): Partial<ChartBuilderState> {
  // Return a partial state that can be used to initialize the chart builder
  // The ChartBuilder will handle finding the actual GroupingOption objects
  return {
    selectedEntityType: config.builderState.selectedEntityType,
    selectedGrouping: config.builderState.selectedGrouping,
    selectedDisplayField: config.builderState.selectedDisplayField,
    selectedAggregation: config.builderState.selectedAggregation,
    selectedSort: config.builderState.selectedSort,
    selectedResultsLimit: config.builderState.selectedResultsLimit,
    selectedChartType: config.builderState.selectedChartType
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

