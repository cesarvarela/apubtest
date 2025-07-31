'use client';

import { useMemo } from 'react';
import { useJsonLdExpansion } from '@/hooks/useJsonLdExpansion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { normalizeEntities } from '@/lib/normalization';

import sampleData from '@/data/sample-aiid-converted.json';

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
};

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
    "affectedParties": {
      "@id": "aiid:affectedParties",
      "@type": "@id",
      "@container": "@set"
    },
    "Report": {
      "@id": "aiid:Report",
      "@type": "@id"
    },
    "date": {
      "@id": "aiid:date",
      "@type": "xsd:date"
    }
  }
};



export default function NormalizationDemo() {
  const { expandedData, loading, error } = useJsonLdExpansion({
    payload: sampleData,
    coreContext,
    localContext
  });

  const normalizedEntities = useMemo(() => {
    // Use the original sample data instead of expanded data
    return normalizeEntities(sampleData);
  }, []);


  // Keep the loading/error states for the expanded data view in the accordion
  const hasExpandedData = !loading && !error && expandedData;

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
            Data Normalization Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Transform JSON-LD structures into normalized entities for analysis and visualization
          </p>
        </div>



        {/* Normalized Root Object */}
        <Card>
          <CardHeader>
            <CardTitle>Normalized Root Object (with references)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-64 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
              value={JSON.stringify(normalizedEntities.normalized, null, 2)}
              readOnly
            />
          </CardContent>
        </Card>

        {/* Extracted Entities */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Entities by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {Object.entries(normalizedEntities.extracted).map(([type, entities]) => (
                <AccordionItem key={type} value={type}>
                  <AccordionTrigger className="text-lg font-semibold">
                    {type} ({(entities as any[]).length} entities)
                  </AccordionTrigger>
                  <AccordionContent>
                    <textarea
                      className="w-full h-64 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                      value={JSON.stringify(entities, null, 2)}
                      readOnly
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Raw Data Views */}
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="source-data">
            <AccordionTrigger className="text-lg font-semibold">
              Source JSON-LD Data ({Array.isArray(sampleData) ? sampleData.length : 0} items)
            </AccordionTrigger>
            <AccordionContent>
              <textarea
                className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                value={JSON.stringify(sampleData, null, 2)}
                readOnly
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="expanded-data">
            <AccordionTrigger className="text-lg font-semibold">
              Expanded JSON-LD Data {loading ? "(Processing...)" : error ? "(Error)" : hasExpandedData ? "" : "(Not available)"}
            </AccordionTrigger>
            <AccordionContent>
              {loading ? (
                <div className="text-center p-8 text-gray-600">Processing JSON-LD expansion...</div>
              ) : error ? (
                <div className="text-center p-8 text-red-600">Error: {error}</div>
              ) : hasExpandedData ? (
                <textarea
                  className="w-full h-96 text-xs bg-gray-100 dark:bg-zinc-900 p-4 rounded border-none resize-none font-mono"
                  value={JSON.stringify(expandedData, null, 2)}
                  readOnly
                />
              ) : (
                <div className="text-center p-8 text-gray-600">Expanded data not available</div>
              )}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </main>
  );
}