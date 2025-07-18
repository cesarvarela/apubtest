'use client';

import { useState, useMemo } from 'react';
import GraphVisualization from '@/components/graph/GraphVisualization';
import { useJsonLdExpansion } from '@/hooks/useJsonLdExpansion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from 'next/link';


const coreContext = {
  "@context": {
    "@protected": true,
    "core": "https://example.org/core#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "Incident": {
      "@id": "core:Incident",
      "@type": "@id"
    },
    "incidentId": {
      "@id": "core:incidentId",
      "@type": "xsd:string"
    },
    "title": {
      "@id": "core:title",
      "@type": "xsd:string"
    },
    "name": {
      "@id": "schema:name",
      "@type": "xsd:string"
    },
    "Organization": {
      "@id": "core:Organization",
      "@type": "@id"
    },
    "Person": "core:Person",
    "email": {
      "@id": "schema:email",
      "@type": "xsd:string"
    }
  }
}

const localContext = {
  "@context": {
    "@protected": true,
    "aiid": "https://example.org/aiid#",
    "core": "https://example.org/core#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "ui": "https://example.org/ui#",
    "aiid:Incident": {
      "@id": "aiid:Incident",
      "@type": "@id"
    },
    "deployedBy": {
      "@id": "aiid:deployedBy",
      "@type": "@id",
      "@container": "@set"
    },
    "reports": {
      "@id": "aiid:reports",
      "@type": "@id",
      "@container": "@set"
    },
    "authors": {
      "@id": "aiid:authors",
      "@type": "@id",
      "@container": "@set"
    },
    "Report": {
      "@id": "aiid:Report",
      "@type": "@id"
    },
    "ui:title": {
      "@id": "ui:title",
      "@type": "@json",
    },
    "ui:incidentId": {
      "@id": "ui:incidentId",
      "@type": "@json"
    },
    "ui:deployedBy": {
      "@id": "ui:deployedBy",
      "@type": "@json"
    },
    "ui:reports": {
      "@id": "ui:reports",
      "@type": "@json"
    }
  }
}

import aiidFullPayload from '@/data/aiid-converted.json';

export default function GraphVisualizationPage() {
  const [showRawData, setShowRawData] = useState(false);
  const [payload, setPayload] = useState(aiidFullPayload);

  const { expandedData, loading, error } = useJsonLdExpansion({
    payload,
    coreContext,
    localContext
  });

  const contexts = useMemo(() => ({ coreContext, localContext }), []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Expanding JSON-LD...</div>
          <div className="text-sm text-gray-600">Processing semantic data for visualization</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">JSON-LD Expansion Error</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-start p-24">
      <div className="w-full max-w-6xl space-y-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Graph Visualization Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive graph visualization showing relationships between semantic entities using Canvas and D3.js force simulation
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-raw-data"
                checked={showRawData}
                onCheckedChange={setShowRawData}
              />
              <Label htmlFor="show-raw-data" className="text-sm font-medium">
                Show Raw Data
              </Label>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Click on nodes to inspect their data • Drag nodes to reposition them
            </div>
          </div>
        </div>

        {/* Graph Visualization */}
        <GraphVisualization
          expandedPayload={expandedData}
          context={contexts}
        />

        {/* Raw Data Display */}
        {showRawData && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="expanded-payload">
                <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
                  Expanded Payload
                </AccordionTrigger>
                <AccordionContent className="px-6">
                  <textarea
                    className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                    value={JSON.stringify(expandedData, null, 2)}
                    readOnly
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="payload">
                <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
                  Original Payload
                </AccordionTrigger>
                <AccordionContent className="px-6">
                  <pre className="text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </main>
  );
}