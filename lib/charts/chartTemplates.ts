import { ChartTemplate } from '@/types/charts';

export const chartTemplates: ChartTemplate[] = [
  {
    id: 'incidents-by-organization',
    title: 'Incidents by Organization',
    description: 'Which organizations have the most incidents?',
    category: 'organizations',
    icon: '🏢',
    config: {
      chartType: 'bar',
      measure: {
        entity: 'aiid:Incident',
        aggregation: 'count'
      },
      dimension: {
        entity: 'core:Organization',
        field: 'name',
        via: 'deployedBy'
      },
      sortBy: 'measure',
      sortOrder: 'desc',
      topN: 15
    }
  },
  {
    id: 'incidents-distribution-by-org',
    title: 'Incident Distribution by Organization',
    description: 'How are incidents distributed across organizations?',
    category: 'organizations',
    icon: '📊',
    config: {
      chartType: 'pie',
      measure: {
        entity: 'aiid:Incident',
        aggregation: 'count'
      },
      dimension: {
        entity: 'core:Organization',
        field: 'name',
        via: 'deployedBy'
      },
      sortBy: 'measure',
      sortOrder: 'desc',
      topN: 10
    }
  },
  {
    id: 'incidents-over-time',
    title: 'Incidents Over Time',
    description: 'How have incidents changed over time?',
    category: 'trends',
    icon: '📈',
    config: {
      chartType: 'line',
      measure: {
        entity: 'aiid:Incident',
        aggregation: 'count'
      },
      dimension: {
        entity: 'aiid:Incident',
        field: 'date'
      },
      sortBy: 'dimension',
      sortOrder: 'asc',
    }
  },
  {
    id: 'affected-parties',
    title: 'Most Affected Parties',
    description: 'Which groups are most affected by incidents?',
    category: 'impact',
    icon: '👥',
    config: {
      chartType: 'bar',
      measure: {
        entity: 'aiid:Incident',
        aggregation: 'count'
      },
      dimension: {
        entity: 'core:Organization',
        field: 'name',
        via: 'affectedParties'
      },
      sortBy: 'measure',
      sortOrder: 'desc',
      topN: 20
    }
  },
  {
    id: 'affected-parties-distribution',
    title: 'Affected Groups Distribution',
    description: 'Distribution of impact across different groups',
    category: 'impact',
    icon: '🥧',
    config: {
      chartType: 'pie',
      measure: {
        entity: 'aiid:Incident',
        aggregation: 'count'
      },
      dimension: {
        entity: 'core:Organization',
        field: 'name',
        via: 'affectedParties'
      },
      sortBy: 'measure',
      sortOrder: 'desc',
      topN: 10
    }
  },
  {
    id: 'reports-per-incident',
    title: 'Reports per Incident',
    description: 'How many reports does each incident have?',
    category: 'content',
    icon: '📄',
    config: {
      chartType: 'bar',
      measure: {
        entity: 'aiid:Report',
        aggregation: 'count'
      },
      dimension: {
        entity: 'aiid:Incident',
        field: 'title',
        via: '_reverse_reports'
      },
      sortBy: 'measure',
      sortOrder: 'desc',
      topN: 15
    }
  }
];

export function getTemplatesByCategory(category: string): ChartTemplate[] {
  return chartTemplates.filter(template => template.category === category);
}

export function getTemplateById(id: string): ChartTemplate | undefined {
  return chartTemplates.find(template => template.id === id);
}