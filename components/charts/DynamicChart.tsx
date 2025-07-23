'use client';

import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

interface DynamicChartData {
  data: Array<{ [key: string]: any }>;
  xLabel: string;
  yLabel: string;
}

interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  xAxis: any | null;
  yAxis: any | null;
  groupBy: any | null;
  aggregation: 'count' | 'sum' | 'average';
  entityType: string | null;
  sortBy: 'count' | 'alphabetical';
  sortOrder: 'asc' | 'desc';
  topN: number | null;
}

interface DynamicChartProps {
  data: DynamicChartData;
  config: ChartConfig;
}

export default function DynamicChart({ data, config }: DynamicChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      // Always clear the container first
      chartRef.current.innerHTML = '';
      
      if (data.data.length === 0) {
        return; // Don't render anything when no data
      }
      
      let plot;
      const xKey = config.groupBy?.key || config.xAxis?.key;
      const yKey = config.aggregation === 'count' ? 'count' : (config.yAxis?.key || 'value');
      
      // Dynamic height based on data size for better readability
      const baseHeight = 400;
      const itemHeight = 30; // Height per item for horizontal bar charts
      const dynamicHeight = config.groupBy ? 
        Math.max(baseHeight, Math.min(800, data.data.length * itemHeight + 100)) : 
        baseHeight;

      const plotConfig: any = {
        title: `${data.yLabel} by ${data.xLabel}`,
        width: 800,
        height: dynamicHeight,
        x: { label: data.xLabel },
        y: { label: data.yLabel }
      };

      switch (config.chartType) {
        case 'bar':
          if (config.groupBy) {
            // Horizontal bar chart for categorical data
            plot = Plot.plot({
              ...plotConfig,
              marginLeft: 200, // Increased margin for longer organization names
              marks: [
                Plot.barX(data.data, {
                  x: yKey,
                  y: xKey,
                  fill: "steelblue",
                  sort: { y: "x", reverse: true }
                }),
                Plot.text(data.data, {
                  x: yKey,
                  y: xKey,
                  text: yKey,
                  dx: 10,
                  fill: "black"
                })
              ]
            });
          } else {
            // Vertical bar chart
            plot = Plot.plot({
              ...plotConfig,
              marks: [
                Plot.barY(data.data, {
                  x: xKey,
                  y: yKey,
                  fill: "steelblue"
                }),
                Plot.text(data.data, {
                  x: xKey,
                  y: yKey,
                  text: yKey,
                  dy: -10,
                  fill: "black"
                })
              ]
            });
          }
          break;
          
        case 'line':
          plot = Plot.plot({
            ...plotConfig,
            marks: [
              Plot.line(data.data, {
                x: xKey,
                y: yKey,
                stroke: "steelblue",
                strokeWidth: 3
              }),
              Plot.dot(data.data, {
                x: xKey,
                y: yKey,
                fill: "steelblue",
                r: 5
              })
            ]
          });
          break;
          
        case 'pie':
          // For pie charts, create a horizontal stacked bar chart
          const total = data.data.reduce((sum: number, item: any) => sum + item[yKey], 0);
          let cumulative = 0;
          const stackedData = data.data.map((d: any) => {
            const start = cumulative;
            cumulative += d[yKey];
            return {
              ...d,
              x1: start / total,
              x2: cumulative / total,
              percentage: ((d[yKey] / total) * 100).toFixed(1)
            };
          });
          
          plot = Plot.plot({
            title: `${data.yLabel} Distribution by ${data.xLabel}`,
            width: 800,
            height: 200,
            x: { 
              label: "Proportion",
              tickFormat: "%",
              domain: [0, 1]
            },
            y: { axis: null },
            marks: [
              Plot.rect(stackedData, {
                x1: "x1",
                x2: "x2",
                y1: 0,
                y2: 1,
                fill: xKey,
                stroke: "white",
                strokeWidth: 2,
                title: (d: any) => `${d[xKey]}: ${d[yKey]} (${d.percentage}%)`
              }),
              Plot.text(stackedData.filter((d: any) => (d.x2 - d.x1) > 0.05), {
                x: (d: any) => (d.x1 + d.x2) / 2,
                y: 0.5,
                text: (d: any) => `${d[xKey]}\n${d.percentage}%`,
                fontSize: 10,
                fill: "white",
                fontWeight: "bold",
                textAnchor: "middle"
              })
            ]
          });
          break;
          
        case 'scatter':
          plot = Plot.plot({
            ...plotConfig,
            marks: [
              Plot.dot(data.data, {
                x: xKey,
                y: yKey,
                fill: "steelblue",
                r: 4
              })
            ]
          });
          break;
          
        default:
          plot = Plot.plot({
            ...plotConfig,
            marks: [
              Plot.barY(data.data, {
                x: xKey,
                y: yKey,
                fill: "steelblue"
              })
            ]
          });
      }
      
      if (plot) {
        chartRef.current.appendChild(plot);
      }
    }
  }, [data, config]);

  return (
    <div className="w-full">
      {data.data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">No data available</div>
            <div className="text-sm">
              Selected configuration: {config.chartType} chart<br />
              X-Axis: {config.xAxis?.key || 'None'}<br />
              Y-Axis: {config.yAxis?.key || 'Count'}<br />
              Aggregation: {config.aggregation}
            </div>
          </div>
        </div>
      ) : (
        <div ref={chartRef} className="flex justify-center" />
      )}
    </div>
  );
}