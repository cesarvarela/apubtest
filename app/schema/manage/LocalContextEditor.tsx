'use client';

import { useState } from 'react';

interface LocalContextEditorProps {
    initialContext: any | null;
    namespace: string;
    hasExistingContext: boolean;
}

export default function LocalContextEditor({ initialContext, namespace, hasExistingContext }: LocalContextEditorProps) {
    const defaultContext = initialContext || {
        "@context": [
            "http://localhost:3000/context/core-v1.jsonld",
            {
                "schema": "http://schema.org/"
            }
        ]
    };
    
    const [context, setContext] = useState<string>(JSON.stringify(defaultContext, null, 2));
    const [isValid, setIsValid] = useState(true);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [parsedContext, setParsedContext] = useState<any | null>(defaultContext);

    const validateContext = (contextText: string): boolean => {
        try {
            const parsed = JSON.parse(contextText);

            if (!parsed['@context']) {
                throw new Error('Context must have a @context property');
            }

            // Check if @context is an array with core context reference
            if (Array.isArray(parsed['@context'])) {
                if (parsed['@context'].length < 2) {
                    throw new Error('Local context @context array must have at least 2 elements: core context reference and local mappings');
                }
                
                const coreReference = parsed['@context'][0];
                if (typeof coreReference !== 'string' || !coreReference.includes('core-v1.jsonld')) {
                    throw new Error('First element of @context array must be a reference to the core context (e.g., "http://localhost:3000/context/core-v1.jsonld")');
                }

                const localMappings = parsed['@context'][1];
                if (typeof localMappings !== 'object' || localMappings === null) {
                    throw new Error('Second element of @context array must be an object containing local mappings');
                }
            } else {
                throw new Error('Local context @context must be an array containing core context reference and local mappings');
            }

            setValidationError('');
            setParsedContext(parsed);
            return true;
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid JSON');
            setParsedContext(null);
            return false;
        }
    };

    const handleContextChange = (value: string) => {
        setContext(value);
        const valid = validateContext(value);
        setIsValid(valid);
        setSaveMessage('');
    };

    const handleSave = async () => {
        if (!isValid) {
            setSaveMessage('Cannot save invalid context');
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/schema/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace,
                    schema: JSON.parse(context),
                    type: 'context'
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save context');
            }

            const result = await response.json();
            setSaveMessage('Context saved successfully!');

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
        const contextText = JSON.stringify(defaultContext, null, 2);
        setContext(contextText);
        setParsedContext(defaultContext);

        setIsValid(true);
        setValidationError('');
        setSaveMessage('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Local Context Editor</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || isSaving}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : (hasExistingContext ? 'Update Context' : 'Create Context')}
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
                <div className="bg-green-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-gray-900">JSON-LD Context Definition</h4>
                    <p className="text-sm text-gray-600 mt-1">
                        Edit the local context for namespace: <code className="bg-gray-100 px-1 rounded">{namespace}</code>
                    </p>
                </div>
                <div className="relative">
                    <textarea
                        value={context}
                        onChange={(e) => handleContextChange(e.target.value)}
                        className={`w-full h-80 p-4 font-mono text-sm border-0 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none ${!isValid ? 'bg-red-50' : 'bg-white'
                            }`}
                        placeholder={`Enter your JSON-LD context here...

Example structure:
{
  "@context": [
    "http://localhost:3000/context/core-v1.jsonld",
    {
      "title": "schema:headline",
      "author": "schema:author",
      "schema": "http://schema.org/"
    }
  ]
}`}
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-medium text-gray-900">Context Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The context must have a <code className="bg-gray-100 px-1 rounded">@context</code> property that is an array</li>
                    <li>First element must reference the core context: <code className="bg-gray-100 px-1 rounded text-xs">"http://localhost:3000/context/core-v1.jsonld"</code></li>
                    <li>Second element must be an object containing local semantic mappings</li>
                    <li>Use schema.org vocabulary where possible (e.g., <code className="bg-gray-100 px-1 rounded">"schema:headline"</code>)</li>
                    <li>Define container types for arrays using <code className="bg-gray-100 px-1 rounded">@container</code></li>
                    <li>Specify data types using <code className="bg-gray-100 px-1 rounded">@type</code> when needed</li>
                </ul>
            </div>

            {/* Context Analysis */}
            {parsedContext && parsedContext['@context'] && Array.isArray(parsedContext['@context']) && (
                <div className="space-y-4">
                    {/* Core Context Reference */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                            <h4 className="font-medium text-gray-900">Core Context Reference</h4>
                        </div>
                        <div className="p-4">
                            <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded font-mono text-sm">
                                {parsedContext['@context'][0]}
                            </span>
                        </div>
                    </div>

                    {/* Local Mappings */}
                    {parsedContext['@context'][1] && typeof parsedContext['@context'][1] === 'object' && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-green-50 px-4 py-2 border-b">
                                <h4 className="font-medium text-gray-900">Local Semantic Mappings</h4>
                            </div>
                            <div className="p-4 space-y-3">
                                {Object.entries(parsedContext['@context'][1]).map(([key, value]) => (
                                    <div key={key} className="flex items-start space-x-3">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">
                                            {key}
                                        </span>
                                        <span className="text-gray-700 text-sm break-all">
                                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
