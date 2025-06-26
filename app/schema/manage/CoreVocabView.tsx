'use client';

import { SchemaObject } from 'ajv';

interface CoreVocabViewProps {
    vocab: SchemaObject | null;
}

export default function CoreVocabView({ vocab }: CoreVocabViewProps) {
    if (!vocab) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Core vocabulary not available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">Vocabulary Definition</h3>
                </div>
                <div className="bg-gray-50">
                    <pre className="p-4 text-sm font-mono text-gray-700 overflow-x-auto">
                        {JSON.stringify(vocab, null, 2)}
                    </pre>
                </div>
            </div>
            
            {/* Vocabulary Analysis */}
            {(vocab.properties || vocab.name || vocab.description) && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b">
                        <h3 className="font-medium text-gray-900">Vocabulary Analysis</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {vocab.name && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                                    name
                                </span>
                                <span className="text-gray-700 text-sm">
                                    {vocab.name}
                                </span>
                            </div>
                        )}
                        {vocab.description && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                                    description
                                </span>
                                <span className="text-gray-700 text-sm">
                                    {vocab.description}
                                </span>
                            </div>
                        )}
                        {vocab.properties && (
                            <div className="flex items-start space-x-3">
                                <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                                    properties
                                </span>
                                <div className="text-gray-700 text-sm space-y-1">
                                    {Object.keys(vocab.properties).map(prop => (
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
