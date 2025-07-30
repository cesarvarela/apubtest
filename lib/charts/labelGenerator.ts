/**
 * Smart label generation utilities for dynamic chart creation
 * Converts technical field names and entity types into human-readable labels
 */

import { formatEntityTypeLabel } from './dynamicAnalyzer';

/**
 * Converts field names to human-readable labels
 * Examples:
 * - "deployedBy" → "Deployed by"
 * - "affectedParties" → "Affected parties"
 * - "reverse_reports" → "Reports (reverse)"
 * - "custom_field_name" → "Custom field name"
 */
export function formatFieldLabel(fieldName: string): string {
  if (fieldName.startsWith('reverse_')) {
    const baseField = fieldName.replace('reverse_', '');
    const formatted = formatFieldLabel(baseField);
    return `${formatted} (reverse)`;
  }

  return fieldName
    .replace(/([A-Z])/g, ' $1') // Convert camelCase
    .replace(/_/g, ' ') // Convert snake_case
    .toLowerCase()
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generates a user-friendly grouping label for chart configuration
 * Uses raw field names without assumptions about naming conventions
 * Examples:
 * - "deployedBy" with target "Organizations" → "by deployedBy (organization)"
 * - "reverse_reports" with target "Reports" → "by report that reference them via reports"
 * - "authors" with target "Persons" → "by authors (person)"
 */
export function generateGroupingLabel(
  fieldName: string, 
  targetTypes: string[] = []
): string {
  const targetLabel = targetTypes.length > 0 
    ? targetTypes.map(type => formatEntityTypeLabel(type).toLowerCase().slice(0, -1)) // Remove plural 's'
    : [];

  if (fieldName.startsWith('reverse_')) {
    const baseField = fieldName.replace('reverse_', '');
    const entityType = targetTypes.length > 0 ? targetLabel[0] : 'entity';
    return `by ${entityType} that reference them via ${baseField}`;
  }

  // Schema-agnostic: use raw field names without assumptions
  if (targetTypes.length > 0) {
    return `by ${fieldName} (${targetLabel.join(', ')})`;
  }

  return `by ${fieldName}`;
}

/**
 * Generates a complete chart description/title
 * Examples:
 * - sourceType="Incidents", groupBy="deployedBy" → "Incidents by deployedBy (organization)"
 * - sourceType="Reports", groupBy="authors" → "Reports by authors (person)"
 */
export function generateChartDescription(
  sourceType: string, 
  groupByField: string, 
  targetTypes: string[] = []
): string {
  const sourceLabel = formatEntityTypeLabel(sourceType);
  const groupLabel = generateGroupingLabel(groupByField, targetTypes);
  
  return `${sourceLabel} ${groupLabel}`;
}

/**
 * Generates a chart title optimized for display
 * Examples:
 * - "Incidents By DeployedBy (Organization)"
 * - "Reports By Authors (Person)"
 * - "Organizations By Incident That Reference Them Via DeployedBy"
 */
export function generateChartTitle(
  sourceType: string, 
  groupByField: string, 
  targetTypes: string[] = []
): string {
  const description = generateChartDescription(sourceType, groupByField, targetTypes);
  
  // Capitalize each word for title case
  return description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Suggests the best chart type based on the data characteristics
 */
export function suggestChartType(
  dataPointCount: number,
  hasLongLabels: boolean = false
): 'bar' | 'horizontal-bar' | 'pie' | 'donut' | 'line' {
  // Use horizontal bars for long labels
  if (hasLongLabels) {
    return 'horizontal-bar';
  }

  // Use pie/donut for small number of categories
  if (dataPointCount <= 5) {
    return 'pie';
  }

  // Default to vertical bar chart
  return 'bar';
}

/**
 * Formats chart axis labels and legends
 */
export function formatChartAxisLabel(
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'cumulative',
  sourceType: string,
  valueField?: string
): string {
  const entityLabel = formatEntityTypeLabel(sourceType);

  switch (aggregation) {
    case 'count':
      return `Number of ${entityLabel}`;
    case 'cumulative':
      return `Cumulative ${entityLabel}`;
    case 'sum':
      return valueField ? `Total ${formatFieldLabel(valueField)}` : 'Sum';
    case 'avg':
      return valueField ? `Average ${formatFieldLabel(valueField)}` : 'Average';
    case 'min':
      return valueField ? `Minimum ${formatFieldLabel(valueField)}` : 'Minimum';
    case 'max':
      return valueField ? `Maximum ${formatFieldLabel(valueField)}` : 'Maximum';
    default:
      return 'Value';
  }
}