'use client';

import { useEffect, useState } from 'react';

interface PropertyInfo {
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    format?: string;
    minLength?: number;
    maxLength?: number;
    const?: string;
    mapping?: string;
    items?: any;
}

interface VocabData {
    localSchema: {
        properties: PropertyInfo[];
        definitions: Record<string, {
            type: string;
            properties: PropertyInfo[];
        }>;
    };
    localContext: {
        mappings: Record<string, any>;
    };
}

function PropertyCard({ property }: { property: PropertyInfo }) {
    const getTypeDescription = (prop: PropertyInfo) => {
        let typeDesc = prop.type || 'unknown';
        
        if (prop.const) {
            typeDesc += ` (must be "${prop.const}")`;
        }
        if (prop.format) {
            typeDesc += ` (${prop.format} format)`;
        }
        if (prop.minLength) {
            typeDesc += ` (min ${prop.minLength} characters)`;
        }
        if (prop.maxLength) {
            typeDesc += ` (max ${prop.maxLength} characters)`;
        }
        if (prop.items) {
            typeDesc += ' of ' + (prop.items.type || 'objects');
        }
        
        return typeDesc;
    };

    return (
        <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">
                <code>{property.name}</code>
                {property.required && <span className="text-red-600 ml-2">(required)</span>}
            </h3>
            <p className="text-gray-700 mb-2">
                Type: {getTypeDescription(property)}
            </p>
            {property.description && (
                <p className="text-gray-700 mb-2">{property.description}</p>
            )}
            {property.mapping && (
                <p className="text-sm text-gray-600">Maps to: <code>{property.mapping}</code></p>
            )}
        </div>
    );
}

export default function LocalVocabPage() {
    const [vocabData, setVocabData] = useState<VocabData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchVocabData() {
            try {
                const response = await fetch('/api/vocab');
                if (!response.ok) {
                    throw new Error(`Failed to fetch vocabulary data: ${response.statusText}`);
                }
                const data = await response.json();
                setVocabData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchVocabData();
    }, []);

    if (loading) {
        return (
            <main className="max-w-4xl mx-auto p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-6"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-8"></div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Local Incident Vocabulary</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vocabulary</h2>
                    <p className="text-red-700">{error}</p>
                    <p className="text-sm text-red-600 mt-2">
                        Make sure you have configured your local schema and context at{' '}
                        <a href="/schema/manage" className="underline">Schema Management</a>.
                    </p>
                </div>
            </main>
        );
    }

    if (!vocabData) {
        return (
            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Local Incident Vocabulary</h1>
                <p>No vocabulary data available.</p>
            </main>
        );
    }
    return (
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Local Incident Vocabulary</h1>
            <p className="text-gray-700 leading-relaxed mb-6">
                This page documents the local JSON schema and JSON-LD context definitions 
                for incident reporting. The local schema extends the core vocabulary with 
                additional properties and mappings to Schema.org terms.
            </p>

            {vocabData.localSchema.properties.length > 0 && (
                <>
                    <h2 className="text-2xl font-semibold mb-4">Schema Properties</h2>
                    <div className="space-y-4 mb-8">
                        {vocabData.localSchema.properties.map((property) => (
                            <PropertyCard key={property.name} property={property} />
                        ))}
                    </div>
                </>
            )}

            {Object.keys(vocabData.localSchema.definitions).length > 0 && (
                <>
                    <h2 className="text-2xl font-semibold mb-4">Object Definitions</h2>
                    {Object.entries(vocabData.localSchema.definitions).map(([defName, definition]) => (
                        <div key={defName} className="mb-8">
                            <h3 className="text-xl font-semibold mb-4">
                                <code>{defName}</code> ({definition.type})
                            </h3>
                            <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-4">
                                {definition.properties.map((property) => (
                                    <PropertyCard key={property.name} property={property} />
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}

            <h2 className="text-2xl font-semibold mb-4">Schema Files</h2>
            <div className="space-y-4 mb-8">
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Local JSON Schema</h3>
                    <p className="text-gray-700 mb-2">Defines the structure and validation rules for local incident data</p>
                    <a href="/schema/manage" className="text-blue-600 hover:text-blue-800 underline">View/Edit Local Schema</a>
                </div>
                
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Local JSON-LD Context</h3>
                    <p className="text-gray-700 mb-2">Maps local properties to Schema.org terms for semantic interoperability</p>
                    <a href="/schema/manage" className="text-blue-600 hover:text-blue-800 underline">View/Edit Local Context</a>
                </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Downloads</h2>
            <ul className="list-disc pl-6 space-y-2">
                <li><a href="/context/core-v1.jsonld" className="text-blue-600 hover:text-blue-800 underline">Core JSON-LD Context (v1)</a></li>
                <li><a href="/schema/core-v1.json" className="text-blue-600 hover:text-blue-800 underline">Core JSON Schema (v1)</a></li>
                <li><a href={`/context/${process.env.NEXT_PUBLIC_NAMESPACE || 'local'}-v1.jsonld`} className="text-blue-600 hover:text-blue-800 underline">Local JSON-LD Context (v1)</a></li>
                <li><a href={`/schema/${process.env.NEXT_PUBLIC_NAMESPACE || 'local'}-v1.json`} className="text-blue-600 hover:text-blue-800 underline">Local JSON Schema (v1)</a></li>
            </ul>

            <footer className="mt-8 text-sm text-gray-500">
                Last updated {new Date().toISOString().slice(0, 10)}
            </footer>
        </main>
    );
}
