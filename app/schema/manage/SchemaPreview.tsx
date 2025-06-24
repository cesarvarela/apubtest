'use client';

import { useState } from 'react';
import { SchemaObject } from 'ajv';

interface SchemaPreviewProps {
    schema: SchemaObject | null;
    namespace: string;
}

export default function SchemaPreview({ schema, namespace }: SchemaPreviewProps) {
    const [activeTab, setActiveTab] = useState<'properties' | 'definitions' | 'raw'>('properties');

    if (!schema) {
        return (
            <div className="p-4 text-center text-gray-500">
                No valid schema to preview
            </div>
        );
    }

    const localProperties = schema.allOf?.[1]?.properties || {};
    const definitions = schema.definitions || {};
    const requiredFields = schema.allOf?.[1]?.required || [];

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            <div className="border-b">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('properties')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            activeTab === 'properties'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Properties
                    </button>
                    <button
                        onClick={() => setActiveTab('definitions')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            activeTab === 'definitions'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Definitions
                    </button>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            activeTab === 'raw'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Raw JSON
                    </button>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'properties' && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Schema Properties</h4>
                            <div className="text-sm text-gray-600 mb-4">
                                Schema ID: <code className="bg-gray-100 px-1 rounded">{schema.$id}</code>
                            </div>
                        </div>

                        {Object.keys(localProperties).length > 0 ? (
                            <div className="space-y-3">
                                <h5 className="font-medium text-gray-800">Local Properties:</h5>
                                {Object.entries(localProperties).map(([key, prop]: [string, any]) => (
                                    <div key={key} className="border-l-4 border-blue-200 pl-3">
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                                {key}
                                            </code>
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {prop.type || 'mixed'}
                                            </span>
                                            {requiredFields.includes(key) && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                    required
                                                </span>
                                            )}
                                        </div>
                                        {prop.description && (
                                            <p className="text-sm text-gray-600 mt-1">{prop.description}</p>
                                        )}
                                        {prop.minLength && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Min length: {prop.minLength}
                                            </p>
                                        )}
                                        {prop.$ref && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                References: <code>{prop.$ref}</code>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No local properties defined</p>
                        )}
                    </div>
                )}

                {activeTab === 'definitions' && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Schema Definitions</h4>
                        {Object.keys(definitions).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(definitions).map(([key, def]: [string, any]) => (
                                    <div key={key} className="border rounded-lg p-3 bg-gray-50">
                                        <h5 className="font-medium text-gray-800 mb-2">
                                            <code className="bg-white px-2 py-1 rounded border">
                                                {key}
                                            </code>
                                        </h5>
                                        <div className="text-sm space-y-1">
                                            <p><strong>Type:</strong> {def.type}</p>
                                            {def.items && (
                                                <div className="ml-4">
                                                    <p><strong>Items:</strong></p>
                                                    {def.items.properties && (
                                                        <div className="ml-4 space-y-1">
                                                            {Object.entries(def.items.properties).map(([propKey, propDef]: [string, any]) => (
                                                                <div key={propKey} className="text-xs">
                                                                    <code className="bg-white px-1 rounded">{propKey}</code>: {propDef.type || propDef.const}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No definitions found</p>
                        )}
                    </div>
                )}

                {activeTab === 'raw' && (
                    <div className="bg-gray-50 rounded border">
                        <pre className="p-4 text-sm overflow-x-auto">
                            <code>{JSON.stringify(schema, null, 2)}</code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
