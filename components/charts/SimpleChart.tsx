'use client';

import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { ChartResult } from '@/lib/charts/chartDataExtractor';
import { generateChartTitle, formatChartAxisLabel } from '@/lib/charts/labelGenerator';

type ChartType = 'bar' | 'horizontal-bar' | 'pie' | 'donut' | 'line';

interface SimpleChartProps {
  data: ChartResult;
  chartType: ChartType;
  resultsLimit?: 10 | 20 | 50 | 100 | 'all';
  className?: string;
}

export default function SimpleChart({ data, chartType, resultsLimit = 20, className = '' }: SimpleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.data.length === 0) {
      return;
    }

    // Clear previous chart
    chartRef.current.innerHTML = '';

    const chartData = resultsLimit === 'all' ? data.data : data.data.slice(0, resultsLimit);
    const hasLongLabels = chartData.some(d => d.label.length > 15);

    // Base configuration
    const baseConfig = {
      width: 800,
      title: generateChartTitle(
        data.config.sourceType, 
        data.config.groupBy, 
        data.metadata.targetEntityType ? [data.metadata.targetEntityType] : []
      ),
      style: {
        fontSize: '14px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    let plot;

    switch (chartType) {
      case 'bar':
        plot = Plot.plot({
          ...baseConfig,
          height: Math.max(400, chartData.length * 25 + 150),
          marginBottom: hasLongLabels ? 100 : 60,
          x: { 
            label: formatChartAxisLabel(data.config.aggregation, data.config.sourceType),
            tickRotate: hasLongLabels ? -45 : 0
          },
          y: { label: 'Group' },
          marks: [
            Plot.barY(chartData, {
              x: 'label',
              y: 'value',
              fill: 'steelblue',
              title: d => `${d.label}: ${d.value}`,
              sort: data.config.groupByFieldType === 'date' ? { x: 'x' } : { x: '-y' } // Sort dates chronologically, others by value
            }),
            Plot.text(chartData, {
              x: 'label',
              y: 'value',
              text: 'value',
              dy: -8,
              fontSize: 11,
              fill: 'black'
            })
          ]
        });
        break;

      case 'horizontal-bar':
        plot = Plot.plot({
          ...baseConfig,
          height: Math.max(400, chartData.length * 30 + 100),
          marginLeft: 200, // More space for labels
          x: { label: formatChartAxisLabel(data.config.aggregation, data.config.sourceType) },
          y: { label: null },
          marks: [
            Plot.barX(chartData, {
              x: 'value',
              y: 'label',
              fill: 'steelblue',
              title: d => `${d.label}: ${d.value}`,
              sort: data.config.groupByFieldType === 'date' ? { y: 'y' } : { y: '-x' } // Sort dates chronologically, others by value
            }),
            Plot.text(chartData, {
              x: 'value',
              y: 'label',
              text: 'value',
              dx: 8,
              fontSize: 11,
              fill: 'black'
            })
          ]
        });
        break;

      case 'pie':
        // Create a horizontal stacked bar as a pie chart alternative
        const total = chartData.reduce((sum, d) => sum + d.value, 0);
        let cumulative = 0;
        const stackedData = chartData.map((d, i) => {
          const start = cumulative;
          cumulative += d.value;
          return {
            ...d,
            x1: start / total,
            x2: cumulative / total,
            percentage: ((d.value / total) * 100).toFixed(1),
            color: i
          };
        });

        plot = Plot.plot({
          ...baseConfig,
          height: 200,
          x: { 
            label: "Proportion",
            tickFormat: "%",
            domain: [0, 1]
          },
          y: { axis: null },
          color: { scheme: 'category10' },
          marks: [
            Plot.rect(stackedData, {
              x1: 'x1',
              x2: 'x2',
              y1: 0,
              y2: 1,
              fill: 'color',
              stroke: 'white',
              strokeWidth: 2,
              title: d => `${d.label}: ${d.value} (${d.percentage}%)`
            }),
            Plot.text(stackedData.filter(d => (d.x2 - d.x1) > 0.05), {
              x: d => (d.x1 + d.x2) / 2,
              y: 0.5,
              text: d => `${d.label}\n${d.percentage}%`,
              fontSize: 10,
              fill: 'white',
              fontWeight: 'bold',
              textAnchor: 'middle'
            })
          ]
        });
        break;

      case 'donut':
        // Create a radial bar chart as donut alternative using waffle chart
        const donutTotal = chartData.reduce((sum, d) => sum + d.value, 0);
        const donutData = chartData.map((d, i) => ({
          ...d,
          percentage: ((d.value / donutTotal) * 100).toFixed(1),
          color: i
        }));

        plot = Plot.plot({
          ...baseConfig,
          height: 400,
          x: { label: null },
          y: { label: null },
          color: { scheme: 'category10' },
          marks: [
            // Create a waffle-like visualization
            Plot.cell(donutData, {
              x: (d, i) => i % 5,
              y: (d, i) => Math.floor(i / 5),
              fill: 'color',
              stroke: 'white',
              strokeWidth: 2,
              title: d => `${d.label}: ${d.value} (${d.percentage}%)`
            }),
            // Add labels
            Plot.text(donutData, {
              x: (d, i) => i % 5,
              y: (d, i) => Math.floor(i / 5),
              text: d => `${d.percentage}%`,
              fontSize: 10,
              fontWeight: 'bold',
              fill: 'white',
              textAnchor: 'middle'
            })
          ]
        });
        break;

      case 'line':
        plot = Plot.plot({
          ...baseConfig,
          height: 400,
          x: { 
            label: 'Group',
            tickRotate: hasLongLabels ? -45 : 0
          },
          y: { label: formatChartAxisLabel(data.config.aggregation, data.config.sourceType) },
          marks: [
            Plot.line(chartData, {
              x: 'label',
              y: 'value',
              stroke: 'steelblue',
              strokeWidth: 3,
              marker: 'circle'
            }),
            Plot.dot(chartData, {
              x: 'label',
              y: 'value',
              fill: 'steelblue',
              r: 4,
              title: d => `${d.label}: ${d.value}`
            }),
            Plot.text(chartData, {
              x: 'label',
              y: 'value',
              text: 'value',
              dy: -10,
              fontSize: 10,
              fill: 'black'
            })
          ]
        });
        break;

      default:
        plot = Plot.plot({
          ...baseConfig,
          height: 400,
          marks: [
            Plot.barY(chartData, {
              x: 'label',
              y: 'value',
              fill: 'steelblue'
            })
          ]
        });
    }

    if (plot) {
      chartRef.current.appendChild(plot);
    }
  }, [data, chartType, resultsLimit]);

  if (!data || data.data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No data available</div>
          <div className="text-sm">Select entity type and grouping to generate chart</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div ref={chartRef} className="flex justify-center overflow-x-auto" />
      {resultsLimit !== 'all' && data.data.length > resultsLimit && (
        <p className="text-sm text-gray-500 italic text-center mt-2">
          Showing top {resultsLimit} results of {data.data.length} total groups
        </p>
      )}
    </div>
  );
}