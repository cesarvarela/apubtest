'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';
import { Button } from '@/components/ui/button';

interface TargetTypeSchemaEditorProps {
    initialSchema: SchemaObject | null;
    onSave: (schema: SchemaObject) => void;
    onCancel: () => void;
}

export default function TargetTypeSchemaEditor({ initialSchema, onSave, onCancel }: TargetTypeSchemaEditorProps) {
    const [schema, setSchema] = useState<string>(
        initialSchema ? JSON.stringify(initialSchema, null, 2) : ''
    );
    const [isValid, setIsValid] = useState(!!initialSchema);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const validateSchema = (schemaText: string): boolean => {
        try {
            const parsed = JSON.parse(schemaText);

            if (!parsed.$id) {
                throw new Error('Schema must have a $id property');
            }

            if (!parsed.type || parsed.type !== 'object') {
                throw new Error('Validation schema must have type: "object"');
            }

            if (!parsed.properties || typeof parsed.properties !== 'object') {
                throw new Error('Validation schema must define properties');
            }

            setValidationError('');
            return true;
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
            return false;
        }
    };

    const handleSchemaChange = (value: string) => {
        setSchema(value);
        const valid = validateSchema(value);
        setIsValid(valid);
    };

    const handleSave = async () => {
        if (!isValid) {
            return;
        }

        setIsSaving(true);

        try {
            const parsedSchema = JSON.parse(schema);
            onSave(parsedSchema);
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {!isValid && validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">
                        <strong>Validation Error:</strong> {validationError}
                    </p>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">JSON Schema Definition</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Edit the validation schema for this target type
                    </p>
                </div>
                <div className="relative">
                    <textarea
                        value={schema}
                        onChange={(e) => handleSchemaChange(e.target.value)}
                        className={`w-full h-96 p-4 font-mono text-sm border-0 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                            !isValid ? 'bg-red-50' : 'bg-white'
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
                    <li>Schema must have <code className="bg-gray-100 px-1 rounded">type: &quot;object&quot;</code></li>
                    <li>Include required properties and their validation rules</li>
                    <li>Use proper JSON Schema format with type definitions</li>
                </ul>
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    disabled={!isValid || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Schema'}
                </Button>
            </div>
        </div>
    );
} 