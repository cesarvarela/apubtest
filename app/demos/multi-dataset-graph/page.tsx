'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { normalizeEntities } from '@/lib/normalization';
import MultiDatasetGraphVisualization from '@/components/graph/MultiDatasetGraphVisualization';
import { DatasetConfig } from '@/components/graph/utils/multiDatasetGraphUtils';

// Import all datasets
import aiidData from '@/data/aiid-converted.json';
import oecdData from '@/data/oecd-converted.json';
import ic3Data from '@/data/ic3-incidents.json';
import teslaData from '@/data/tesla-incidents.json';

export default function MultiDatasetGraphPage() {
  // Prepare dataset configurations with normalized data
  const datasets = useMemo<DatasetConfig[]>(() => {
    return [
      {
        id: 'aiid',
        name: 'AIID',
        color: '#ef4444', // red
        data: normalizeEntities(aiidData)
      },
      {
        id: 'oecd',
        name: 'OECD',
        color: '#3b82f6', // blue
        data: normalizeEntities(oecdData)
      },
      {
        id: 'ic3',
        name: 'IC3',
        color: '#10b981', // green
        data: normalizeEntities(ic3Data)
      },
      {
        id: 'tesla',
        name: 'Tesla',
        color: '#f59e0b', // amber
        data: normalizeEntities(teslaData)
      }
    ];
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Link
              href="/demos"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Demos
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Multi-Dataset Force Graph
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Interactive force-directed graph visualization combining data from AIID, OECD, IC3, and Tesla datasets.
              Entities with the same @type and @id across datasets are automatically linked.
            </p>
          </div>
        </div>

        {/* Main Visualization */}
        <MultiDatasetGraphVisualization datasets={datasets} />
      </div>
    </main>
  );
}