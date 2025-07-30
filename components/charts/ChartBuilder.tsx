'use client';

import { useMemo, useEffect } from 'react';
import { NormalizationResult } from '@/lib/normalization';
import { 
  discoverEntityTypes,
  getGroupingOptions,
  getGroupingTargetTypes,
  getDisplayableFields
} from '@/lib/charts/dynamicAnalyzer';
import { ChartConfig } from '@/types/charts';
import { extractChartData } from '@/lib/charts/measureDimensionExtractor';
import {
  generateGroupingLabel,
  generateChartDescription
} from '@/lib/charts/labelGenerator';
import { ChartBuilderState, GroupingOption, DefaultOpenStates } from '@/lib/charts/types';
import { ChartResult } from '@/lib/charts/chartDataExtractor';

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
      .filter(field => field.fieldName !== '@type') // Only skip @type, allow @id
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
    
    // Build chart configuration from state
    let chartType: ChartConfig['chartType'] = 'bar';
    switch (state.selectedChartType) {
      case 'bar':
      case 'horizontal-bar':
        chartType = 'bar';
        break;
      case 'line':
        chartType = 'line';
        break;
      case 'pie':
      case 'donut':
        chartType = 'pie';
        break;
    }

    // Determine sort configuration
    let sortBy: 'measure' | 'dimension' = 'measure';
    let sortOrder: 'asc' | 'desc' = 'desc';
    switch (state.selectedSort) {
      case 'count-desc':
        sortBy = 'measure';
        sortOrder = 'desc';
        break;
      case 'count-asc':
        sortBy = 'measure';
        sortOrder = 'asc';
        break;
      case 'alpha-asc':
      case 'chrono-asc':
        sortBy = 'dimension';
        sortOrder = 'asc';
        break;
      case 'alpha-desc':
      case 'chrono-desc':
        sortBy = 'dimension';
        sortOrder = 'desc';
        break;
    }

    const config: ChartConfig = {
      chartType,
      measure: {
        entity: state.selectedEntityType,
        aggregation: state.selectedAggregation === 'cumulative' ? 'count' : 
                     (state.selectedAggregation as 'count' | 'sum' | 'avg'),
      },
      dimension: {
        entity: state.selectedGrouping.targetTypes.length > 0 ? 
                state.selectedGrouping.targetTypes[0] : 
                state.selectedEntityType,
        field: state.selectedDisplayField || state.selectedGrouping.fieldName,
        ...(state.selectedGrouping.targetTypes.length > 0 && {
          via: state.selectedGrouping.fieldName
        })
      },
      sortBy,
      sortOrder,
      topN: state.selectedResultsLimit === 'all' ? undefined : state.selectedResultsLimit
    };

    // Extract data using the configuration
    const chartData = extractChartData(normalizedData, config);
    
    // Build result for chart components
    const result: ChartResult = {
      data: chartData.data.map(item => ({
        label: String(item[config.dimension.field] || ''),
        value: item.value || 0,
        count: item.count || 0,
        entities: item.entities || []
      })),
      config: {
        sourceType: state.selectedEntityType,
        groupBy: state.selectedGrouping.fieldName,
        groupByFieldType: state.selectedGrouping.fieldType,
        aggregation: state.selectedAggregation,
        groupByLabelField: state.selectedDisplayField || undefined,
        targetTypeFilter: state.selectedGrouping.targetTypes.length === 1 ? state.selectedGrouping.targetTypes[0] : undefined,
        sortBy: state.selectedSort
      },
      metadata: {
        totalEntities: (normalizedData.extracted[state.selectedEntityType] || []).length,
        uniqueGroups: chartData.data.length,
        sourceEntityType: state.selectedEntityType,
        targetEntityType: state.selectedGrouping.targetTypes.length > 0 ? state.selectedGrouping.targetTypes[0] : undefined
      }
    };

    return result;
  }, [normalizedData, state]);

  // Call onChartResult callback when chartResult changes
  useEffect(() => {
    if (onChartResult) {
      onChartResult(chartResult);
    }
  }, [chartResult]); // Removed onChartResult to prevent infinite loop

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