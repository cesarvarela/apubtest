'use client';

import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { ChartResult } from '@/lib/charts/chartDataExtractor';
import { generateChartTitle, formatChartAxisLabel } from '@/lib/charts/labelGenerator';
import { ChartType } from '@/lib/charts/types';

interface ChartRendererProps {
  data: ChartResult;
  chartType: ChartType;
  resultsLimit?: 10 | 20 | 50 | 100 | 'all';
  className?: string;
}

export default function ChartRenderer({ data, chartType, resultsLimit = 20, className = '' }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.data.length === 0) {
      return;
    }

    // Clear previous chart
    chartRef.current.innerHTML = '';

    const chartData = data.data;
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
        // Create a proper donut chart using D3.js
        const donutContainer = document.createElement('div');
        const width = 800;
        const height = 400;
        const margin = 40;
        const radius = Math.min(width, height) / 2 - margin;
        const innerRadius = radius * 0.6; // Create the donut hole
        
        // Import D3 dynamically
        import('d3').then(d3 => {
          const svg = d3.select(donutContainer)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
          
          // Prepare data
          const total = chartData.reduce((sum, d) => sum + d.value, 0);
          const dataWithPercentage = chartData.map((d, i) => ({
            ...d,
            percentage: ((d.value / total) * 100).toFixed(1)
          }));
          
          // Create color scale
          const color = d3.scaleOrdinal(d3.schemeCategory10);
          
          // Create pie layout
          const pie = d3.pie<any, typeof dataWithPercentage[0]>()
            .value(d => d.value)
            .sort(null); // Keep original order
          
          // Create arc generator
          const arc = d3.arc<any, d3.PieArcDatum<typeof dataWithPercentage[0]>>()
            .innerRadius(innerRadius)
            .outerRadius(radius);
          
          // Create label arc for positioning labels
          const labelArc = d3.arc<any, d3.PieArcDatum<typeof dataWithPercentage[0]>>()
            .innerRadius(radius * 0.8)
            .outerRadius(radius * 0.8);
          
          // Create arc paths
          const arcs = svg.selectAll('arc')
            .data(pie(dataWithPercentage))
            .enter()
            .append('g')
            .attr('class', 'arc');
          
          // Add arc paths
          arcs.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => color(i.toString()))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
              d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', () => {
                  const [x, y] = arc.centroid(d);
                  return `translate(${x * 0.1}, ${y * 0.1})`;
                });
            })
            .on('mouseout', function(event, d) {
              d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', 'translate(0, 0)');
            });
          
          // Add tooltips
          arcs.append('title')
            .text(d => `${d.data.label}: ${d.data.value} (${d.data.percentage}%)`);
          
          // Add labels for segments > 5%
          arcs.filter(d => parseFloat(d.data.percentage) > 5)
            .append('text')
            .attr('transform', d => `translate(${labelArc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text(d => `${d.data.percentage}%`);
          
          // Add center text showing total
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('dy', '-0.5em')
            .text(chartData.length);
          
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#666')
            .attr('dy', '1em')
            .text('groups');
          
        }).catch(err => {
          console.error('Failed to load D3:', err);
          donutContainer.innerHTML = '<div class="text-red-500">Failed to render donut chart</div>';
        });
        
        chartRef.current.appendChild(donutContainer);
        return; // Exit early as we're handling the DOM directly

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
      {data.data.length < data.metadata.uniqueGroups && (
        <p className="text-sm text-gray-500 italic text-center mt-2">
          Showing top {data.data.length} results of {data.metadata.uniqueGroups} total groups
        </p>
      )}
    </div>
  );
}