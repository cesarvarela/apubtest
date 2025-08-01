'use client';

import { useEffect, useRef, useState } from 'react';
import * as Plot from '@observablehq/plot';
import { formatChartAxisLabel } from '@/lib/charts/labelGenerator';
import { ChartType, ChartResult } from '@/lib/charts/types';

interface ChartRendererProps {
  data: ChartResult;
  chartType: ChartType;
  resultsLimit?: 10 | 20 | 50 | 100 | 'all';
  className?: string;
}

export default function ChartRenderer({ data, chartType, resultsLimit = 20, className = '' }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  // Set up ResizeObserver to track container width
  useEffect(() => {
    if (!chartRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        // Only update if width changed significantly (avoid unnecessary re-renders)
        setContainerWidth(prev => Math.abs(prev - width) > 10 ? Math.max(300, width) : prev);
      }
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      width: containerWidth,
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
          height: 400,
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
        donutContainer.style.position = 'relative'; // For tooltip positioning
        const width = containerWidth;
        const height = 400; // Standardized height to match other charts
        const margin = Math.min(80, width * 0.15); // Adjusted margin for standard height
        const radius = Math.min(width, height) / 2 - margin;
        const innerRadius = radius * 0.5; // Create the donut hole
        
        // Import D3 dynamically
        import('d3').then(d3 => {
          const svg = d3.select(donutContainer)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width * 0.4}, ${height / 2})`);
          
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
            .style('cursor', 'pointer');
          
          // Add tooltips
          arcs.append('title')
            .text(d => `${d.data.label}: ${d.data.value} (${d.data.percentage}%)`);
          
          // Sort data by value to get top 5
          const sortedData = [...dataWithPercentage].sort((a, b) => b.value - a.value);
          const top5Labels = new Set(sortedData.slice(0, 5).map(d => d.label));
          
          // Add labels with polylines only for top 5
          const labelRadius = radius * 1.25;
          const outerArc = d3.arc<any, d3.PieArcDatum<typeof dataWithPercentage[0]>>()
            .innerRadius(labelRadius)
            .outerRadius(labelRadius);
          
          // Filter arcs for permanent labels (only top 5)
          const labeledArcs = arcs.filter((d: any) => top5Labels.has(d.data.label));
          
          // Calculate label positions for top 5
          const labelData: any[] = [];
          labeledArcs.each((d: any) => {
            const pos = outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            const isRightSide = midangle < Math.PI;
            pos[0] = labelRadius * 0.98 * (isRightSide ? 1 : -1);
            
            labelData.push({
              data: d,
              x: pos[0],
              y: pos[1],
              isRightSide,
              midangle
            });
          });
          
          // Sort labels by y position
          labelData.sort((a, b) => a.y - b.y);
          
          // Simple overlap prevention for top 5
          const minLabelSpacing = 30;
          for (let i = 1; i < labelData.length; i++) {
            const current = labelData[i];
            const previous = labelData[i - 1];
            
            if (current.isRightSide === previous.isRightSide) {
              const yDiff = current.y - previous.y;
              if (yDiff < minLabelSpacing) {
                current.y = previous.y + minLabelSpacing;
              }
            }
          }
          
          // Add polylines for top 5 labels
          labeledArcs.append('polyline')
            .attr('stroke', '#999')
            .attr('stroke-width', 1)
            .attr('fill', 'none')
            .attr('opacity', 0.3)
            .attr('points', (d: any) => {
              const labelInfo = labelData.find(l => l.data === d);
              const posA = arc.centroid(d);
              const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
              const intermediateRadius = radius * 1.1;
              const posB = [
                Math.cos(midangle - Math.PI / 2) * intermediateRadius,
                Math.sin(midangle - Math.PI / 2) * intermediateRadius
              ];
              const posC = [labelInfo.x * 0.9, labelInfo.y];
              return [posA, posB, posC].map(p => p.join(',')).join(' ');
            });
          
          // Add permanent labels for top 5
          labeledArcs.append('text')
            .attr('transform', (d: any) => {
              const labelInfo = labelData.find(l => l.data === d);
              return `translate(${labelInfo.x}, ${labelInfo.y})`;
            })
            .attr('text-anchor', (d: any) => {
              const labelInfo = labelData.find(l => l.data === d);
              return labelInfo.isRightSide ? 'start' : 'end';
            })
            .attr('font-size', '11px')
            .attr('font-weight', 'normal')
            .each(function(d: any) {
              const text = d3.select(this);
              text.append('tspan')
                .attr('x', 0)
                .attr('dy', '0')
                .attr('font-weight', '600')
                .text(d.data.label);
              text.append('tspan')
                .attr('x', 0)
                .attr('dy', '1.1em')
                .attr('fill', '#666')
                .attr('font-size', '10px')
                .text(`${d.data.percentage}%`);
            });
          
          // Create hover tooltip for all segments
          const tooltip = d3.select(donutContainer)
            .append('div')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000);
          
          // Update hover interactions to show tooltip for all segments
          arcs.on('mouseover', function(event, d: any) {
            // Highlight the segment
            d3.select(this).select('path')
              .transition()
              .duration(200)
              .attr('transform', () => {
                const [x, y] = arc.centroid(d);
                return `translate(${x * 0.1}, ${y * 0.1})`;
              })
              .style('filter', 'brightness(1.1)');
            
            // Show tooltip
            tooltip
              .html(`<strong>${d.data.label}</strong><br/>${d.data.value} (${d.data.percentage}%)`)
              .transition()
              .duration(200)
              .style('opacity', 1);
          })
          .on('mousemove', function(event) {
            // Position tooltip near cursor
            const [mouseX, mouseY] = d3.pointer(event, donutContainer);
            tooltip
              .style('left', (mouseX + 10) + 'px')
              .style('top', (mouseY - 10) + 'px');
          })
          .on('mouseout', function(event, d) {
            // Reset segment
            d3.select(this).select('path')
              .transition()
              .duration(200)
              .attr('transform', 'translate(0, 0)')
              .style('filter', 'none');
            
            // Hide tooltip
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0);
          });
          
          // Add center text showing total
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', `${Math.max(18, Math.min(24, width / 25))}px`)
            .attr('font-weight', 'bold')
            .attr('dy', '-0.5em')
            .text(chartData.length);
          
          svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', `${Math.max(12, Math.min(14, width / 40))}px`)
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
        // Check if data is date-based
        const isDateData = data.config.groupByFieldType === 'date';
        const tooManyPoints = chartData.length > 50;
        
        // Prepare data for temporal scale if needed
        const processedData = isDateData ? chartData.map(d => ({
          ...d,
          date: new Date(d.label),
          originalLabel: d.label
        })) : chartData;
        
        // Configure x-axis based on data type
        const xAxisConfig = isDateData ? {
          label: 'Date',
          type: 'time' as const,
          tickFormat: chartData.length > 365 ? '%Y' : 
                      chartData.length > 60 ? '%b %Y' : 
                      chartData.length > 30 ? '%b %d' : '%Y-%m-%d',
          ticks: Math.min(10, Math.ceil(chartData.length / 50)) // Adaptive tick count
        } : {
          label: 'Group',
          tickRotate: hasLongLabels ? -45 : 0,
          // For non-date data with many points, show fewer ticks
          ticks: chartData.length > 30 ? Math.min(10, Math.ceil(chartData.length / 10)) : undefined
        };
        
        const lineMarks = [
          Plot.line(processedData, {
            x: isDateData ? 'date' : 'label',
            y: 'value',
            stroke: 'steelblue',
            strokeWidth: 3,
            marker: 'circle'
          }),
          Plot.dot(processedData, {
            x: isDateData ? 'date' : 'label',
            y: 'value',
            fill: 'steelblue',
            r: 4,
            title: d => `${d.originalLabel || d.label}: ${d.value}`
          })
        ];
        
        // Only add value labels if not too many points
        if (!tooManyPoints) {
          lineMarks.push(
            Plot.text(processedData, {
              x: isDateData ? 'date' : 'label',
              y: 'value',
              text: 'value',
              dy: -10,
              fontSize: 10,
              fill: 'black'
            })
          );
        }
        
        plot = Plot.plot({
          ...baseConfig,
          height: 400,
          marginBottom: hasLongLabels && !isDateData ? 100 : 60,
          x: xAxisConfig,
          y: { label: formatChartAxisLabel(data.config.aggregation, data.config.sourceType) },
          marks: lineMarks
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
  }, [data, chartType, resultsLimit, containerWidth]);

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