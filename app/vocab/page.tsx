'use client';

import { useEffect, useState } from 'react';

interface VocabTerm {
    '@id': string;
    '@type': string;
    label?: string;
    comment?: string;
    range?: string;
    domain?: string;
    'rdfs:subClassOf'?: string;
}

interface VocabData {
    vocab: {
        '@graph': VocabTerm[];
        '@context': Record<string, any>;
    };
    metadata: {
        id: string;
        uri: string;
        createdAt: string;
        updatedAt: string;
    };
    namespace: string;
}

function VocabTermCard({ term }: { term: VocabTerm }) {
    const getTermType = (type: string) => {
        switch (type) {
            case 'owl:Class':
                return 'Class';
            case 'owl:ObjectProperty':
                return 'Object Property';
            case 'owl:DatatypeProperty':
                return 'Data Property';
            default:
                return type;
        }
    };

    return (
        <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">
                <code>{term['@id']}</code>
                <span className="ml-2 text-sm font-normal text-gray-600">
                    ({getTermType(term['@type'])})
                </span>
            </h3>
            {term.label && (
                <p className="text-gray-900 font-medium mb-2">{term.label}</p>
            )}
            {term.comment && (
                <p className="text-gray-700 mb-2">{term.comment}</p>
            )}
            <div className="text-sm text-gray-600 space-y-1">
                {term.domain && (
                    <p><strong>Domain:</strong> <code>{term.domain}</code></p>
                )}
                {term.range && (
                    <p><strong>Range:</strong> <code>{term.range}</code></p>
                )}
                {term['rdfs:subClassOf'] && (
                    <p><strong>Subclass of:</strong> <code>{term['rdfs:subClassOf']}</code></p>
                )}
            </div>
        </div>
    );
}

export default function VocabPage() {
    const [vocabData, setVocabData] = useState<VocabData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchVocabData() {
            try {
                const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
                console.log('Fetching vocab for namespace:', namespace);
                
                const response = await fetch(`/api/schemas/vocab?namespace=${namespace}`);
                console.log('Vocab response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Vocab data:', data);
                    setVocabData(data);
                } else {
                    const errorData = await response.json();
                    console.log('Vocab error:', errorData);
                    throw new Error(`Failed to fetch vocabulary: ${response.statusText}`);
                }
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
                <h1 className="text-3xl font-bold mb-6">Vocabulary</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vocabulary</h2>
                    <p className="text-red-700">{error}</p>
                    <p className="text-sm text-red-600 mt-2">
                        Make sure you have configured your vocabulary at{' '}
                        <a href="/schema/manage" className="underline">Schema Management</a>.
                    </p>
                </div>
            </main>
        );
    }

    if (!vocabData) {
        return (
            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Vocabulary</h1>
                <p>No vocabulary data available.</p>
            </main>
        );
    }

    // Group terms by type
    const termsByType = vocabData.vocab['@graph'].reduce((acc, term) => {
        const type = term['@type'];
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(term);
        return acc;
    }, {} as Record<string, VocabTerm[]>);

    return (
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Vocabulary</h1>
            <p className="text-gray-700 leading-relaxed mb-6">
                This vocabulary defines the terms and properties used for AI incident reporting.
                It includes classes, object properties, and data properties with their semantic definitions.
            </p>

            {vocabData.metadata && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-2">Vocabulary Information</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Namespace:</strong> {vocabData.namespace}</p>
                        <p><strong>URI:</strong> <code>{vocabData.metadata.uri}</code></p>
                        <p><strong>Last Updated:</strong> {new Date(vocabData.metadata.updatedAt).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {Object.entries(termsByType).map(([type, terms]) => (
                <div key={type} className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">
                        {type === 'owl:Class' && 'Classes'}
                        {type === 'owl:ObjectProperty' && 'Object Properties'}
                        {type === 'owl:DatatypeProperty' && 'Data Properties'}
                        {!['owl:Class', 'owl:ObjectProperty', 'owl:DatatypeProperty'].includes(type) && type}
                    </h2>
                    <div className="space-y-4">
                        {terms.map((term) => (
                            <VocabTermCard key={term['@id']} term={term} />
                        ))}
                    </div>
                </div>
            ))}

            <h2 className="text-2xl font-semibold mb-4">Downloads</h2>
            <ul className="list-disc pl-6 space-y-2">
                <li><a href={`/api/schemas/vocab?namespace=${vocabData.namespace}`} className="text-blue-600 hover:text-blue-800 underline">Download Vocabulary (JSON-LD)</a></li>
                <li><a href="/schema/manage" className="text-blue-600 hover:text-blue-800 underline">Manage Vocabulary</a></li>
            </ul>

            <footer className="mt-8 text-sm text-gray-500">
                Last updated {new Date(vocabData.metadata.updatedAt).toLocaleDateString()}
            </footer>
        </main>
    );
}
