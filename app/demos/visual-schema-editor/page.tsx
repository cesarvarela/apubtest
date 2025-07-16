'use client';

import { useState } from 'react';
import VisualSchemaEditor from '@/components/schema-editor/VisualSchemaEditor';
import { ValidationSchema, ContextSchema, AvailableType } from '@/components/schema-editor/types';

const sampleValidationSchema: ValidationSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "@context": {
      "oneOf": [
        { "type": "string" },
        { "type": "array" },
        { "type": "object" }
      ]
    },
    "@type": {
      "oneOf": [
        { "const": "demo:SampleType" },
        { 
          "type": "array",
          "contains": { "const": "demo:SampleType" }
        }
      ]
    },
    "@id": {
      "type": "string",
      "format": "uri"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "description": {
      "type": "string"
    },
    "priority": {
      "type": "number",
      "minimum": 1,
      "maximum": 5
    },
    "isActive": {
      "type": "boolean"
    }
  },
  "required": ["@type", "@id", "title"],
  "additionalProperties": false
};

const sampleContextSchema: ContextSchema = {
  "@context": {
    "@protected": true,
    "demo": "https://example.org/demo#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "SampleType": {
      "@id": "demo:SampleType",
      "@type": "@id"
    },
    "title": {
      "@id": "schema:name",
      "@type": "xsd:string"
    },
    "description": {
      "@id": "schema:description",
      "@type": "xsd:string"
    },
    "priority": {
      "@id": "demo:priority",
      "@type": "xsd:integer"
    },
    "isActive": {
      "@id": "demo:isActive",
      "@type": "xsd:boolean"
    }
  }
};

const availableTypes: AvailableType[] = [
  {
    name: "Incident",
    fullType: "core:Incident", 
    namespace: "core",
    context: {
      "@context": {
        "@protected": true,
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "Incident": { "@id": "core:Incident", "@type": "@id" },
        "id": "@id",
        "title": { "@id": "schema:name", "@type": "xsd:string" },
        "name": { "@id": "schema:name", "@type": "xsd:string" }
      }
    }
  },
  {
    name: "Organization",
    fullType: "core:Organization",
    namespace: "core", 
    context: {
      "@context": {
        "@protected": true,
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "Organization": { "@id": "core:Organization", "@type": "@id" },
        "id": "@id",
        "title": { "@id": "schema:name", "@type": "xsd:string" },
        "name": { "@id": "schema:name", "@type": "xsd:string" }
      }
    }
  },
  {
    name: "Person",
    fullType: "core:Person",
    namespace: "core",
    context: {
      "@context": {
        "@protected": true,
        "core": "https://example.org/core#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "Person": "core:Person",
        "id": "@id",
        "name": { "@id": "schema:name", "@type": "xsd:string" },
        "email": { "@id": "schema:email", "@type": "xsd:string" }
      }
    }
  },
  {
    name: "Report",
    fullType: "aiid:Report",
    namespace: "aiid",
    context: {
      "@context": {
        "@protected": true,
        "aiid": "https://example.org/aiid#",
        "schema": "https://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "Report": { "@id": "aiid:Report", "@type": "@id" },
        "id": "@id"
      }
    }
  }
];

export default function VisualSchemaEditorDemo() {
  const [validationSchema, setValidationSchema] = useState(sampleValidationSchema);
  const [contextSchema, setContextSchema] = useState(sampleContextSchema);

  const handleSave = (newValidationSchema: ValidationSchema, newContextSchema: ContextSchema) => {
    setValidationSchema(newValidationSchema);
    setContextSchema(newContextSchema);
    console.log('Updated Validation Schema:', newValidationSchema);
    console.log('Updated Context Schema:', newContextSchema);
    alert('Schema updated! Check the console for output.');
  };

  const handleCancel = () => {
    console.log('Editor cancelled');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Visual Schema Editor Demo</h1>
          <p className="text-muted-foreground">
            Create JSON schemas and JSON-LD contexts using a visual interface
          </p>
        </div>
      </div>
      
      <div className="h-[calc(100vh-120px)]">
        <VisualSchemaEditor
          namespace="demo"
          targetType="SampleType"
          validationSchema={validationSchema}
          contextSchema={contextSchema}
          availableTypes={availableTypes}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}