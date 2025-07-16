'use client';

import { useState } from 'react';
import GraphVisualization from '@/components/semantic/GraphVisualization';
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

const payload = {
  "@context": [
    "http://localhost:3000/api/schemas/v1/core/context.jsonld",
    "http://localhost:3001/api/schemas/v1/aiid/context.jsonld"
  ],
  "@type": "aiid:Incident",
  "@id": "https://incidentdatabase.ai/incident/23",
  "incidentId": "INC-2024-MED-001",
  "title": "AI Model Misclassification in Medical Diagnosis System",
  "deployedBy": [
    {
      "@type": "core:Organization",
      "@id": "https://en.wikipedia.org/wiki/Google",
      "name": "Google LLC",
    },
    {
      "@type": "core:Organization",
      "@id": "https://en.wikipedia.org/wiki/DeepMind",
      "name": "DeepMind Technologies",
    },
  ],
  "reports": [
    {
      "@type": "aiid:Report",
      "@id": "https://incidentdatabase.ai/report/1002",
      "title": "Medical AI System Fails to Detect Rare Condition",
      "author": {
        "@type": "core:Person",
        "@id": "https://example.org/person/jane-doe",
        "name": "Jane Doe",
        "email": "jane.doe@example.org"
      }
    },
    {
      "@type": "aiid:Report",
      "@id": "https://incidentdatabase.ai/report/1003",
      "title": "Diagnostic Algorithm Shows Bias in Minority Patient Cases",
      "author": {
        "@type": "core:Person",
        "@id": "https://example.org/person/john-smith",
        "name": "John Smith",
        "email": "john.smith@example.org"
      }
    },
    {
      "@type": "aiid:Report",
      "@id": "https://incidentdatabase.ai/report/1004",
      "title": "Follow-up Analysis of Diagnostic Failures",
      "author": {
        "@type": "core:Person",
        "@id": "https://example.org/person/jane-doe",
        "name": "Jane Doe",
        "email": "jane.doe@example.org"
      }
    }
  ],
  "ui:deployedBy": {
    "component": "DeployedByFieldRenderer",
    "label": "Deployed By"
  },
  "ui:reports": {
    "label": "Related Reports"
  },
  "ui:title": {
    "label": "Incident Title",
    "order": 1
  },
  "ui:incidentId": {
    "label": "Incident ID",
    "order": 2
  },
}

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
    "author": {
      "@id": "aiid:author",
      "@type": "@id"
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

export default function GraphVisualizationPage() {
  const [showRawData, setShowRawData] = useState(false);

  const { expandedData, loading, error } = useJsonLdExpansion({
    payload,
    coreContext,
    localContext
  });

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
            Interactive graph visualization showing relationships between semantic entities using Observable Plot
          </p>
        </div>

        {/* Controls */}
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
            Click on nodes to inspect their data
          </div>
        </div>

        {/* Graph Visualization */}
        <GraphVisualization
          expandedPayload={expandedData}
          context={{ coreContext, localContext }}
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