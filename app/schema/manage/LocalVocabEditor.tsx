'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save, Zap } from 'lucide-react';

interface LocalVocabEditorProps {
    initialVocab: SchemaObject | null;
    namespace: string;
    hasExistingVocab: boolean;
}

export default function LocalVocabEditor({ initialVocab, namespace, hasExistingVocab }: LocalVocabEditorProps) {
    // Only pre-populate if there's an existing vocab
    const initialVocabText = initialVocab ? JSON.stringify(initialVocab, null, 2) : '';

    const [vocab, setVocab] = useState<string>(initialVocabText);
    const [isValid, setIsValid] = useState(!!initialVocab);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [parsedVocab, setParsedVocab] = useState<SchemaObject | null>(initialVocab);

    const validateVocab = (vocabText: string): boolean => {
        if (!vocabText.trim()) {
            setValidationError('');
            setIsValid(false);
            setParsedVocab(null);
            return false;
        }

        try {
            const parsed = JSON.parse(vocabText);
            
            // Basic validation for vocab structure
            if (!parsed.$id && !parsed.name && !parsed['@context']) {
                setValidationError('Vocab must have at least one of: $id, name, or @context property');
                setIsValid(false);
                setParsedVocab(null);
                return false;
            }

            setValidationError('');
            setIsValid(true);
            setParsedVocab(parsed);
            return true;
        } catch (error) {
            setValidationError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsValid(false);
            setParsedVocab(null);
            return false;
        }
    };

    const handleVocabChange = (value: string) => {
        setVocab(value);
        validateVocab(value);
        setSaveMessage(''); // Clear save message when editing
    };

    const resetToOriginal = () => {
        setVocab(initialVocabText);
        validateVocab(initialVocabText);
        setSaveMessage('');
    };

    const saveVocab = async () => {
        if (!isValid || !vocab.trim()) {
            setSaveMessage('Cannot save invalid vocab');
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
                    type: 'vocab',
                    schema: JSON.parse(vocab)
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setSaveMessage(`Vocab ${result.action} successfully!`);
                // Refresh the page to get updated data
                window.location.reload();
            } else {
                const error = await response.json();
                setSaveMessage(`Failed to save vocab: ${error.error}`);
            }
        } catch (error) {
            setSaveMessage(`Failed to save vocab: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Local Vocabulary Editor</h3>
                </div>
                <div className="flex gap-2">
                    {hasExistingVocab && (
                        <Button
                            onClick={resetToOriginal}
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                    )}
                    <Button
                        onClick={saveVocab}
                        disabled={!isValid || isSaving || !vocab.trim()}
                        size="sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : (hasExistingVocab ? 'Update Vocab' : 'Create Vocab')}
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
                <div className={`p-3 border rounded-md ${saveMessage.includes('success')
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    <p className="text-sm">{saveMessage}</p>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-gray-900">Vocabulary Definition</h4>
                    <p className="text-sm text-gray-600 mt-1">
                        Define vocabulary terms for namespace: <code className="bg-gray-100 px-1 rounded">{namespace}</code>
                    </p>
                </div>
                <div className="relative">
                    <textarea
                        value={vocab}
                        onChange={(e) => handleVocabChange(e.target.value)}
                        className={`w-full h-80 p-4 font-mono text-sm border-0 resize-none focus:ring-2 focus:ring-yellow-500 focus:outline-none ${!isValid ? 'bg-red-50' : 'bg-white'
                            }`}
                        placeholder={`Enter your vocabulary JSON structure here...

Example structure:
{
  "$id": "http://localhost:3002/vocab/${namespace}",
  "name": "${namespace} Vocabulary",
  "description": "Vocabulary definitions for ${namespace}",
  "properties": {
    "terms": {
      "type": "object"
    }
  }
}`}
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-medium text-gray-900">Vocabulary Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Vocabulary must have at least one of: <code className="bg-gray-100 px-1 rounded">$id</code>, <code className="bg-gray-100 px-1 rounded">name</code>, or <code className="bg-gray-100 px-1 rounded">@context</code></li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">properties</code> to define vocabulary terms</li>
                    <li>Include <code className="bg-gray-100 px-1 rounded">description</code> for documentation</li>
                    <li>Support both JSON Schema and JSON-LD vocabulary formats</li>
                </ul>
            </div>

            {/* Vocabulary Preview */}
            {parsedVocab && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-yellow-50 px-4 py-2 border-b">
                        <h4 className="font-medium text-gray-900">Vocabulary Preview</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        {parsedVocab.$id && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-mono">
                                    $id
                                </span>
                                <span className="text-gray-700 text-sm break-all">
                                    {parsedVocab.$id}
                                </span>
                            </div>
                        )}
                        {parsedVocab.name && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-mono">
                                    name
                                </span>
                                <span className="text-gray-700 text-sm">
                                    {parsedVocab.name}
                                </span>
                            </div>
                        )}
                        {parsedVocab.description && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-mono">
                                    description
                                </span>
                                <span className="text-gray-700 text-sm">
                                    {parsedVocab.description}
                                </span>
                            </div>
                        )}
                        {parsedVocab.properties && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-mono">
                                    properties
                                </span>
                                <div className="text-gray-700 text-sm space-y-1">
                                    {Object.keys(parsedVocab.properties).map(prop => (
                                        <span key={prop} className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block mr-2 mb-1">
                                            {prop}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
