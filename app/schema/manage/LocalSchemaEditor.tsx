'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save, Database } from 'lucide-react';
import SchemaPreview from './SchemaPreview';

interface LocalSchemaEditorProps {
    initialSchema: SchemaObject | null;
    namespace: string;
    hasExistingSchema: boolean;
}

export default function LocalSchemaEditor({ initialSchema, namespace, hasExistingSchema }: LocalSchemaEditorProps) {
    const defaultSchemaTemplate = {
        "$id": `http://localhost:3002/schema/${namespace}-v1.json`,
        "type": "object",
        "allOf": [
            {
                "$ref": "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-schema.json"
            },
            {
                "type": "object",
                "required": ["title", "description"],
                "properties": {
                    "title": {
                        "type": "string",
                        "minLength": 1
                    },
                    "description": {
                        "type": "string",
                        "minLength": 1
                    }
                },
                "additionalProperties": true
            }
        ]
    };

    // Only pre-populate if there's an existing schema
    const initialSchemaText = initialSchema ? JSON.stringify(initialSchema, null, 2) : '';

    const [schema, setSchema] = useState<string>(initialSchemaText);
    const [isValid, setIsValid] = useState(!!initialSchema);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [parsedSchema, setParsedSchema] = useState<SchemaObject | null>(initialSchema);

    const validateSchema = (schemaText: string): boolean => {
        // Allow empty schema text (will show placeholder)
        if (!schemaText.trim()) {
            setValidationError('');
            setParsedSchema(null);
            return false;
        }

        try {
            const parsed = JSON.parse(schemaText);

            if (!parsed.$id) {
                throw new Error('Schema must have a $id property');
            }

            if (!parsed.allOf || !Array.isArray(parsed.allOf)) {
                throw new Error('Local schema must have an allOf property that is an array');
            }

            if (parsed.allOf.length < 2) {
                throw new Error('allOf array must have at least 2 elements: core schema reference and local schema definition');
            }

            // Check first element is a reference to core schema
            const coreRef = parsed.allOf[0];
            if (!coreRef.$ref || !coreRef.$ref.includes('core-schema.json')) {
                throw new Error('First element of allOf must be a $ref to the core schema (e.g., "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-schema.json")');
            }

            // Check second element has local schema properties
            const localSchema = parsed.allOf[1];
            if (!localSchema.type || localSchema.type !== 'object') {
                throw new Error('Second element of allOf must be an object schema with type: "object"');
            }

            if (!localSchema.properties || typeof localSchema.properties !== 'object') {
                throw new Error('Local schema must define properties');
            }

            // Check for definitions if referenced
            const schemaStr = JSON.stringify(parsed);
            if (schemaStr.includes('#/definitions/') && !parsed.definitions) {
                throw new Error('Schema contains references to #/definitions/ but no definitions section is provided');
            }

            setValidationError('');
            setParsedSchema(parsed);
            return true;
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
            setParsedSchema(null);
            return false;
        }
    };

    const handleSchemaChange = (value: string) => {
        setSchema(value);
        const valid = validateSchema(value);
        setIsValid(valid);
        setSaveMessage('');
    };

    const handleSave = async () => {
        if (!isValid || !schema.trim()) {
            setSaveMessage('Cannot save invalid or empty schema');
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/schemas/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace,
                    schema: JSON.parse(schema),
                    type: 'schema'
                }),
            });

            if (!response.ok) {

                let errorMessage = 'Failed to save schema';

                try {
                    const error = await response.json();
                    errorMessage = error.message || error.error || errorMessage;
                }
                catch (parseError) {

                    try {
                        const errorText = await response.text();

                        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                    }
                    catch (textError) {

                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            setSaveMessage('Schema saved successfully!');

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        catch (error) {
        
            setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
        
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        const schemaText = JSON.stringify(defaultSchemaTemplate, null, 2);
        setSchema(schemaText);
        setParsedSchema(defaultSchemaTemplate);

        setIsValid(true);
        setValidationError('');
        setSaveMessage('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Local Schema Editor</h3>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        size="sm"
                        disabled={isSaving}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!isValid || isSaving || !schema.trim()}
                        size="sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : (hasExistingSchema ? 'Update Schema' : 'Create Schema')}
                    </Button>
                </div>
            </div>

            {!isValid && validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">
                        <strong>Validation Error:</strong> {validationError}
                    </p>
                </div>
            )}

            {saveMessage && (
                <div className={`p-3 border rounded-md ${saveMessage.startsWith('Error')
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                    <p className="text-sm">{saveMessage}</p>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-gray-900">JSON Schema Definition</h4>
                    <p className="text-sm text-gray-600 mt-1">
                        Edit the local schema for namespace: <code className="bg-gray-100 px-1 rounded">{namespace}</code>
                    </p>
                </div>
                <div className="relative">
                    <textarea
                        value={schema}
                        onChange={(e) => handleSchemaChange(e.target.value)}
                        className={`w-full h-80 p-4 font-mono text-sm border-0 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none ${!isValid ? 'bg-red-50' : 'bg-white'
                            }`}
                        placeholder={`Enter your JSON schema here...

Example structure:
{
  "$id": "http://localhost:3002/schema/${namespace}-v1.json",
  "type": "object",
  "allOf": [
    {
      "$ref": "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-schema.json"
    },
    {
      "type": "object",
      "required": ["title", "description"],
      "properties": {
        "title": {
          "type": "string",
          "minLength": 5
        }
      },
      "additionalProperties": true
    }
  ]
}`}
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-medium text-gray-900">Schema Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The schema must have a <code className="bg-gray-100 px-1 rounded">$id</code> property with your namespace URL</li>
                    <li>Must use <code className="bg-gray-100 px-1 rounded">allOf</code> array with core schema <code className="bg-gray-100 px-1 rounded">$ref</code> as first element</li>
                    <li>The core schema reference must point to: <code className="bg-gray-100 px-1 rounded text-xs">https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-schema.json</code></li>
                    <li>Second element defines local properties with <code className="bg-gray-100 px-1 rounded">type: "object"</code></li>
                    <li>Include <code className="bg-gray-100 px-1 rounded">required</code> array for mandatory fields</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">definitions</code> section for reusable schemas (referenced via <code className="bg-gray-100 px-1 rounded">#/definitions/</code>)</li>
                    <li>Set <code className="bg-gray-100 px-1 rounded">additionalProperties: true</code> to allow extensibility</li>
                </ul>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-gray-900">Schema Preview & Analysis</h4>
                </div>
                <div className="p-4">
                    {parsedSchema ? (
                        <div className="space-y-4">
                            {/* Core Schema Reference */}
                            {parsedSchema.allOf && Array.isArray(parsedSchema.allOf) && parsedSchema.allOf[0]?.$ref && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-3 py-2 border-b">
                                        <h5 className="text-sm font-medium text-gray-900">Core Schema Reference</h5>
                                    </div>
                                    <div className="p-3">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-sm">
                                            {parsedSchema.allOf[0].$ref}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Local Properties */}
                            {parsedSchema.allOf && Array.isArray(parsedSchema.allOf) && parsedSchema.allOf[1]?.properties && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-blue-50 px-3 py-2 border-b">
                                        <h5 className="text-sm font-medium text-gray-900">Local Properties</h5>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {Object.entries(parsedSchema.allOf[1].properties).map(([key, value]) => (
                                            <div key={key} className="flex items-start space-x-2">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                                    {key}
                                                </span>
                                                <span className="text-gray-700 text-sm">
                                                    {typeof value === 'object' && value !== null && 'type' in value
                                                        ? `${value.type}${(value as any).$ref ? ` (ref: ${(value as any).$ref})` : ''}`
                                                        : JSON.stringify(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Required Fields */}
                            {parsedSchema.allOf && Array.isArray(parsedSchema.allOf) && parsedSchema.allOf[1]?.required && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-yellow-50 px-3 py-2 border-b">
                                        <h5 className="text-sm font-medium text-gray-900">Required Fields</h5>
                                    </div>
                                    <div className="p-3">
                                        <div className="flex gap-2 flex-wrap">
                                            {parsedSchema.allOf[1].required.map((field: string) => (
                                                <span key={field} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-mono">
                                                    {field}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Definitions */}
                            {parsedSchema.definitions && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-purple-50 px-3 py-2 border-b">
                                        <h5 className="text-sm font-medium text-gray-900">Definitions</h5>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {Object.keys(parsedSchema.definitions).map((key) => (
                                            <span key={key} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm font-mono">
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <SchemaPreview schema={parsedSchema} namespace={namespace} />
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>Invalid schema - please fix validation errors</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
