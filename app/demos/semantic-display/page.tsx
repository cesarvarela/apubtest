'use client';

import { useState } from 'react';
import SemanticRenderer from '@/components/semantic/SemanticRenderer';
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
  ],
  "reports": [
    {
      "@type": "aiid:Report",
      "@id": "https://incidentdatabase.ai/report/1002",
      "title": "Medical AI System Fails to Detect Rare Condition"
    },
    {
      "@type": "aiid:Report",
      "@id": "https://incidentdatabase.ai/report/1003",
      "title": "Diagnostic Algorithm Shows Bias in Minority Patient Cases"
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

export default function SemanticDisplayPage() {
  const [debugMode, setDebugMode] = useState(false);

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
          <div className="text-sm text-gray-600">Processing semantic data</div>
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
    <main className="flex flex-col items-start p-24">
      <div className="w-full max-w-5xl space-y-8">
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
            Semantic Display Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive renderer for JSON-LD data with customizable field components
          </p>
        </div>
        {/* Debug Controls */}
        <div className="flex items-center space-x-2 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Switch
            id="debug-mode"
            checked={debugMode}
            onCheckedChange={setDebugMode}
          />
          <Label htmlFor="debug-mode" className="text-sm font-medium">
            Debug Mode
          </Label>
          {debugMode && (
            <span className="text-xs text-gray-500 ml-2">
              Shows renderer types with colored borders
            </span>
          )}
        </div>

        {/* Semantic Rendering Demo */}
        <div className="semantic-demo">
          <SemanticRenderer
            expandedPayload={expandedData}
            context={{ coreContext, localContext }}
            debug={debugMode}
          />
        </div>

        {/* Data Display */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
          <Accordion type="multiple" defaultValue={["expanded-payload"]} className="w-full">
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
                Payload
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <pre className="text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="core-context">
              <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
                Core Context
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                  value={JSON.stringify(coreContext, null, 2)}
                  readOnly
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="local-context">
              <AccordionTrigger className="px-6 text-lg font-semibold text-gray-900 dark:text-white">
                Local Context
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <textarea
                  className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                  value={JSON.stringify(localContext, null, 2)}
                  readOnly
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </main>
  );
}