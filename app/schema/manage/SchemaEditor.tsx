'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';
import SchemaPreview from './SchemaPreview';

interface SchemaEditorProps {
    initialSchema: SchemaObject | null;
    namespace: string;
    hasExistingSchema: boolean;
}

export default function SchemaEditor({ initialSchema, namespace, hasExistingSchema }: SchemaEditorProps) {
    const [schema, setSchema] = useState<string>(JSON.stringify(initialSchema, null, 2));
    const [isValid, setIsValid] = useState(true);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [parsedSchema, setParsedSchema] = useState<SchemaObject | null>(initialSchema);

    const validateSchema = (schemaText: string): boolean => {
        try {
            const parsed = JSON.parse(schemaText);

            if (!parsed.$id) {
                throw new Error('Schema must have a $id property');
            }

            if (!parsed.allOf || !Array.isArray(parsed.allOf)) {
                throw new Error('Local schema must have an allOf property that is an array');
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
        if (!isValid) {
            setSaveMessage('Cannot save invalid schema');
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
                const error = await response.json();
                throw new Error(error.message || 'Failed to save schema');
            }

            const result = await response.json();
            setSaveMessage('Schema saved successfully!');

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {

        if (initialSchema) {
            const schemaText = JSON.stringify(initialSchema, null, 2);
            setSchema(schemaText);
            setParsedSchema(initialSchema);
        }

        setIsValid(true);
        setValidationError('');
        setSaveMessage('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">Schema Editor</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            disabled={isSaving}
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isValid || isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : (hasExistingSchema ? 'Update Schema' : 'Create Schema')}
                        </button>
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
                        <h3 className="font-medium text-gray-900">JSON Schema Definition</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Edit the local schema for namespace: <code className="bg-gray-100 px-1 rounded">{namespace}</code>
                        </p>
                    </div>
                    <div className="relative">
                        <textarea
                            value={schema}
                            onChange={(e) => handleSchemaChange(e.target.value)}
                            className={`w-full h-96 p-4 font-mono text-sm border-0 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none ${!isValid ? 'bg-red-50' : 'bg-white'
                                }`}
                            placeholder="Enter your JSON schema here..."
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                    <h4 className="font-medium text-gray-900">Schema Guidelines:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>The schema must have a <code className="bg-gray-100 px-1 rounded">$id</code> property</li>
                        <li>Local schemas should use the <code className="bg-gray-100 px-1 rounded">allOf</code> pattern to extend the core schema</li>
                        <li>Include a <code className="bg-gray-100 px-1 rounded">definitions</code> section for reusable components</li>
                        <li>Use proper JSON Schema format with type definitions and validation rules</li>
                    </ul>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Schema Preview</h2>
                <SchemaPreview schema={parsedSchema} namespace={namespace} />
            </div>
        </div>
    );
}
