'use client';

import { useMemo, useEffect } from 'react';
import { NormalizationResult } from '@/lib/normalization';
import { 
  discoverEntityTypes,
  getGroupingOptions,
  getGroupingTargetTypes,
  getDisplayableFields,
  selectDefaultDisplayField
} from '@/lib/charts/dynamicAnalyzer';
import { 
  extractChartData, 
  validateChartConfig,
  ChartConfig,
  ChartResult
} from '@/lib/charts/chartDataExtractor';
import {
  generateGroupingLabel,
  generateChartDescription
} from '@/lib/charts/labelGenerator';
import { ChartBuilderState, GroupingOption, DefaultOpenStates } from '@/lib/charts/types';

import EntityTypeCard from './EntityTypeCard';
import GroupingCard from './GroupingCard';
import DisplayFieldCard from './DisplayFieldCard';
import ChartConfigurationCard from './ChartConfigurationCard';
import ChartPreviewCard from './ChartPreviewCard';

interface ChartBuilderProps {
  normalizedData: NormalizationResult;
  state: ChartBuilderState;
  onStateChange: (newState: ChartBuilderState) => void;
  defaultOpenStates?: DefaultOpenStates;
  onChartResult?: (result: ChartResult | null) => void;
}

export default function ChartBuilder({
  normalizedData,
  state,
  onStateChange,
  defaultOpenStates = {
    entityType: true,
    grouping: false,
    displayField: false,
    configuration: false,
    preview: false
  },
  onChartResult
}: ChartBuilderProps) {
  // Discover all available entity types
  const entityTypes = useMemo(() => {
    return discoverEntityTypes(normalizedData);
  }, [normalizedData]);

  // Get available grouping options for selected entity type
  const groupingOptions = useMemo(() => {
    if (!state.selectedEntityType) return [];
    
    const fields = getGroupingOptions(normalizedData, state.selectedEntityType);
    
    const options: GroupingOption[] = [];
    
    fields
      .filter(field => !field.fieldName.startsWith('@')) // Skip JSON-LD metadata
      .forEach(field => {
        const targetTypes = getGroupingTargetTypes(normalizedData, state.selectedEntityType!, field.fieldName);
        
        if (targetTypes.length === 0) {
          // Non-reference field - create single option
          options.push({
            fieldName: field.fieldName,
            label: generateGroupingLabel(field.fieldName, targetTypes),
            description: generateChartDescription(state.selectedEntityType!, field.fieldName, targetTypes),
            targetTypes,
            frequency: field.frequency,
            fieldType: field.type
          });
        } else if (targetTypes.length === 1) {
          // Single-type reference field - create single option
          const availableDisplayFields = getDisplayableFields(normalizedData, targetTypes);
          options.push({
            fieldName: field.fieldName,
            label: generateGroupingLabel(field.fieldName, targetTypes),
            description: generateChartDescription(state.selectedEntityType!, field.fieldName, targetTypes),
            targetTypes,
            frequency: field.frequency,
            availableDisplayFields,
            fieldType: field.type
          });
        } else {
          // Multi-type reference field - create separate option for each type
          targetTypes.forEach(targetType => {
            const availableDisplayFields = getDisplayableFields(normalizedData, [targetType]);
            options.push({
              fieldName: field.fieldName,
              label: generateGroupingLabel(field.fieldName, [targetType]),
              description: generateChartDescription(state.selectedEntityType!, field.fieldName, [targetType]),
              targetTypes: [targetType],
              frequency: field.frequency,
              availableDisplayFields,
              fieldType: field.type
            });
          });
        }
      });
    
    return options.sort((a, b) => b.frequency - a.frequency); // Sort by frequency
  }, [normalizedData, state.selectedEntityType]);

  // Generate chart data when configuration is complete
  const chartResult = useMemo(() => {
    if (!state.selectedEntityType || !state.selectedGrouping) return null;
    
    // For reference fields, use selected display field or fallback
    let groupByLabelField: string | undefined;
    if (state.selectedGrouping.targetTypes.length > 0) {
      if (state.selectedDisplayField) {
        groupByLabelField = state.selectedDisplayField;
      } else if (state.selectedGrouping.availableDisplayFields && state.selectedGrouping.availableDisplayFields.length > 0) {
        // Auto-select the best available display field using our new function
        groupByLabelField = selectDefaultDisplayField(state.selectedGrouping.availableDisplayFields) || undefined;
      }
      // No fallback to hardcoded 'name' - fully dynamic
    }
    
    const config: ChartConfig = {
      sourceType: state.selectedEntityType,
      groupBy: state.selectedGrouping.fieldName,
      groupByFieldType: state.selectedGrouping.fieldType,
      aggregation: state.selectedAggregation,
      groupByLabelField,
      targetTypeFilter: state.selectedGrouping.targetTypes.length === 1 ? state.selectedGrouping.targetTypes[0] : undefined,
      sortBy: state.selectedSort
    };
    
    const validation = validateChartConfig(normalizedData, config);
    if (!validation.valid) {
      console.error('Invalid chart config:', validation.errors);
      return null;
    }

    return extractChartData(normalizedData, config);
  }, [normalizedData, state.selectedEntityType, state.selectedGrouping, state.selectedDisplayField, state.selectedAggregation, state.selectedSort]);

  // Call onChartResult callback when chartResult changes
  useEffect(() => {
    if (onChartResult) {
      onChartResult(chartResult);
    }
  }, [chartResult, onChartResult]);

  return (
    <div className="space-y-6">
      <EntityTypeCard
        entityTypes={entityTypes}
        state={state}
        onStateChange={onStateChange}
        defaultOpen={defaultOpenStates.entityType}
      />
      
      <GroupingCard
        groupingOptions={groupingOptions}
        state={state}
        onStateChange={onStateChange}
        defaultOpen={defaultOpenStates.grouping}
      />
      
      <DisplayFieldCard
        state={state}
        onStateChange={onStateChange}
        defaultOpen={defaultOpenStates.displayField}
      />
      
      <ChartConfigurationCard
        state={state}
        onStateChange={onStateChange}
        defaultOpen={defaultOpenStates.configuration}
      />
      
      <ChartPreviewCard
        chartResult={chartResult}
        state={state}
        defaultOpen={defaultOpenStates.preview}
      />
    </div>
  );
}