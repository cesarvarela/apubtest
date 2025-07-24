'use client';

import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { ChartConfig, ChartData } from '@/types/charts';

interface DynamicChartProps {
  data: ChartData;
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
      const dimensionKey = config.dimension.field;
      const measureKey = 'measure';
      
      // Dynamic height based on data size for better readability
      const baseHeight = 400;
      const itemHeight = 30; // Height per item for horizontal bar charts
      const dynamicHeight = Math.max(baseHeight, Math.min(800, data.data.length * itemHeight + 100));

      const plotConfig: any = {
        title: `${data.measureLabel} by ${data.dimensionLabel}`,
        width: 800,
        height: dynamicHeight,
        x: { label: data.dimensionLabel },
        y: { label: data.measureLabel }
      };

      switch (config.chartType) {
        case 'bar':
          // Use horizontal bar chart for better label readability
          plot = Plot.plot({
            ...plotConfig,
            marginLeft: 200, // Increased margin for longer names
            marks: [
              Plot.barX(data.data, {
                x: measureKey,
                y: dimensionKey,
                fill: "steelblue",
                sort: { y: "x", reverse: true }
              }),
              Plot.text(data.data, {
                x: measureKey,
                y: dimensionKey,
                text: measureKey,
                dx: 10,
                fill: "black"
              })
            ]
          });
          break;
          
        case 'line':
          plot = Plot.plot({
            ...plotConfig,
            marks: [
              Plot.line(data.data, {
                x: dimensionKey,
                y: measureKey,
                stroke: "steelblue",
                strokeWidth: 3
              }),
              Plot.dot(data.data, {
                x: dimensionKey,
                y: measureKey,
                fill: "steelblue",
                r: 5
              })
            ]
          });
          break;
          
        case 'pie':
          // For pie charts, create a horizontal stacked bar chart
          const total = data.data.reduce((sum: number, item: any) => sum + item[measureKey], 0);
          let cumulative = 0;
          const stackedData = data.data.map((d: any) => {
            const start = cumulative;
            cumulative += d[measureKey];
            return {
              ...d,
              x1: start / total,
              x2: cumulative / total,
              percentage: ((d[measureKey] / total) * 100).toFixed(1)
            };
          });
          
          plot = Plot.plot({
            title: `${data.measureLabel} Distribution by ${data.dimensionLabel}`,
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
                fill: dimensionKey,
                stroke: "white",
                strokeWidth: 2,
                title: (d: any) => `${d[dimensionKey]}: ${d[measureKey]} (${d.percentage}%)`
              }),
              Plot.text(stackedData.filter((d: any) => (d.x2 - d.x1) > 0.05), {
                x: (d: any) => (d.x1 + d.x2) / 2,
                y: 0.5,
                text: (d: any) => `${d[dimensionKey]}\n${d.percentage}%`,
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
                x: dimensionKey,
                y: measureKey,
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
                x: dimensionKey,
                y: measureKey,
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
              Measure: {config.measure.entity} ({config.measure.aggregation})<br />
              Dimension: {config.dimension.entity} ({config.dimension.field})<br />
              {config.dimension.via && `Via: ${config.dimension.via}`}
            </div>
          </div>
        </div>
      ) : (
        <div ref={chartRef} className="flex justify-center" />
      )}
    </div>
  );
}