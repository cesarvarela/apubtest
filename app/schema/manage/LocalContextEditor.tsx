'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save, FileCode, ChevronDown, ChevronUp } from 'lucide-react';

interface LocalContextEditorProps {
    initialContext: any | null;
    namespace: string;
    hasExistingContext: boolean;
}

export default function LocalContextEditor({ initialContext, namespace, hasExistingContext }: LocalContextEditorProps) {
    const defaultContextTemplate = {
        "@context": [
            "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-context.jsonld",
            {
                "schema": "http://schema.org/"
            }
        ]
    };
    
    // Only pre-populate if there's an existing context
    const initialContextText = initialContext ? JSON.stringify(initialContext, null, 2) : '';
    
    const [context, setContext] = useState<string>(initialContextText);
    const [isValid, setIsValid] = useState(!!initialContext);
    const [validationError, setValidationError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [parsedContext, setParsedContext] = useState<any | null>(initialContext);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [showAllMappings, setShowAllMappings] = useState(false);

    const validateContext = (contextText: string): boolean => {
        // Allow empty context text (will show placeholder)
        if (!contextText.trim()) {
            setValidationError('');
            setParsedContext(null);
            return false;
        }

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
                if (typeof coreReference !== 'string' || !coreReference.includes('core-context.jsonld')) {
                    throw new Error('First element of @context array must be a reference to the core context (e.g., "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-context.jsonld")');
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
        if (!isValid || !context.trim()) {
            setSaveMessage('Cannot save invalid or empty context');
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
                    schema: JSON.parse(context),
                    type: 'context'
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to save context';
                try {
                    const error = await response.json();
                    errorMessage = error.message || error.error || errorMessage;
                } catch {
                    // If response is not JSON, try to get text
                    try {
                        const errorText = await response.text();
                        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                    } catch {
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }
                throw new Error(errorMessage);
            }

            await response.json();
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
        const contextText = JSON.stringify(defaultContextTemplate, null, 2);
        setContext(contextText);
        setParsedContext(defaultContextTemplate);

        setIsValid(true);
        setValidationError('');
        setSaveMessage('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Local Context Editor</h3>
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
                        disabled={!isValid || isSaving || !context.trim()}
                        size="sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : (hasExistingContext ? 'Update Context' : 'Create Context')}
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
    "https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-context.jsonld",
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
                    <li>First element must reference the core context: <code className="bg-gray-100 px-1 rounded text-xs">https://github.com/ul-dsri/semantic-incident-db-prototype/blob/main/schemas/core-context.jsonld</code></li>
                    <li>Second element must be an object containing local semantic mappings</li>
                    <li>Use schema.org vocabulary where possible (e.g., <code className="bg-gray-100 px-1 rounded">&quot;schema:headline&quot;</code>)</li>
                    <li>Define container types for arrays using <code className="bg-gray-100 px-1 rounded">@container</code></li>
                    <li>Specify data types using <code className="bg-gray-100 px-1 rounded">@type</code> when needed</li>
                </ul>
            </div>

            {/* Context Analysis */}
            {parsedContext && parsedContext['@context'] && Array.isArray(parsedContext['@context']) && (
                <div className="border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                        className="w-full bg-green-50 px-4 py-2 border-b flex items-center justify-between hover:bg-green-100 transition-colors"
                    >
                        <h4 className="font-medium text-gray-900">Context Preview & Analysis</h4>
                        {isPreviewCollapsed ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                        ) : (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                        )}
                    </button>
                    {!isPreviewCollapsed && (
                        <div className="p-4">
                            <div className="space-y-4">
                                {/* Core Context Reference */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-3 py-2 border-b">
                                        <h5 className="text-sm font-medium text-gray-900">Core Context Reference</h5>
                                    </div>
                                    <div className="p-3">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-sm">
                                            {parsedContext['@context'][0]}
                                        </span>
                                    </div>
                                </div>

                                {/* Local Mappings */}
                                {parsedContext['@context'][1] && typeof parsedContext['@context'][1] === 'object' && (() => {
                                    const mappingEntries = Object.entries(parsedContext['@context'][1]);
                                    const visibleMappings = showAllMappings ? mappingEntries : mappingEntries.slice(0, 3);
                                    const hasMoreMappings = mappingEntries.length > 3;

                                    return (
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-green-50 px-3 py-2 border-b">
                                                <h5 className="text-sm font-medium text-gray-900">Local Semantic Mappings</h5>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                {visibleMappings.map(([key, value]) => (
                                                    <div key={key} className="flex items-start space-x-3">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">
                                                            {key}
                                                        </span>
                                                        <span className="text-gray-700 text-sm break-all">
                                                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {hasMoreMappings && (
                                                    <button
                                                        onClick={() => setShowAllMappings(!showAllMappings)}
                                                        className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium"
                                                    >
                                                        {showAllMappings ? (
                                                            <>
                                                                <ChevronUp className="h-4 w-4" />
                                                                Show less ({mappingEntries.length - 3} hidden)
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="h-4 w-4" />
                                                                Show {mappingEntries.length - 3} more mappings
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
