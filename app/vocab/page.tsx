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

interface ContextData {
    context: Record<string, any>;
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

function ContextSection({ contextData }: { contextData: ContextData }) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">JSON-LD Context</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
                The JSON-LD context defines namespace mappings and semantic annotations for the vocabulary terms.
            </p>
            
            {contextData.metadata && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-2">Context Information</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Namespace:</strong> {contextData.namespace}</p>
                        <p><strong>URI:</strong> <code>{contextData.metadata.uri}</code></p>
                        <p><strong>Last Updated:</strong> {new Date(contextData.metadata.updatedAt).toLocaleString()}</p>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-2">Context Mappings</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* Handle @context as array */}
                    {Array.isArray(contextData.context['@context']) ? (
                        contextData.context['@context'].map((item, index) => (
                            <div key={index} className="mb-4">
                                {typeof item === 'string' ? (
                                    <div className="mb-2">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">External Context Reference:</h4>
                                        <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded block break-all">
                                            {item}
                                        </code>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Local Property Mappings:</h4>
                                        <div className="space-y-2">
                                            {Object.entries(item).map(([key, value]) => (
                                                <div key={key} className="border-b border-gray-200 pb-2">
                                                    <div className="flex flex-wrap items-start gap-2">
                                                        <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">{key}</code>
                                                        <span className="text-gray-500">→</span>
                                                        <code className="text-sm font-mono bg-green-50 px-2 py-1 rounded flex-1 break-all">
                                                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                                        </code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        /* Fallback for non-array @context */
                        Object.entries(contextData.context).map(([key, value]) => (
                            <div key={key} className="border-b border-gray-200 pb-2">
                                <div className="flex flex-wrap items-start gap-2">
                                    <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">{key}</code>
                                    <span className="text-gray-500">→</span>
                                    <code className="text-sm font-mono bg-green-50 px-2 py-1 rounded flex-1 break-all">
                                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                    </code>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-4">
                <a 
                    href={`/api/schemas/context?namespace=${contextData.namespace}`} 
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    Download Context (JSON-LD)
                </a>
            </div>
        </div>
    );
}

function NotFoundSection({ title, description, error }: { title: string; description: string; error: string }) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{title}</h2>
            <p className="text-gray-700 leading-relaxed mb-4">{description}</p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Not Found</h3>
                <p className="text-yellow-700 mb-2">{error}</p>
                <p className="text-sm text-yellow-600">
                    Configure this at{' '}
                    <a href="/schema/manage" className="underline">Schema Management</a>.
                </p>
            </div>
        </div>
    );
}

export default function VocabPage() {
    const [vocabData, setVocabData] = useState<VocabData | null>(null);
    const [contextData, setContextData] = useState<ContextData | null>(null);
    const [loading, setLoading] = useState(true);
    const [vocabError, setVocabError] = useState<string | null>(null);
    const [contextError, setContextError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
                console.log('Fetching vocab and context for namespace:', namespace);
                
                // Fetch vocab data
                try {
                    const vocabResponse = await fetch(`/api/schemas/vocab?namespace=${namespace}`);
                    console.log('Vocab response status:', vocabResponse.status);
                    
                    if (vocabResponse.ok) {
                        const vocabData = await vocabResponse.json();
                        console.log('Vocab data:', vocabData);
                        setVocabData(vocabData);
                    } else {
                        const errorData = await vocabResponse.json();
                        console.log('Vocab error:', errorData);
                        setVocabError(`Failed to fetch vocabulary: ${vocabResponse.statusText}`);
                    }
                } catch (err) {
                    console.error('Vocab fetch error:', err);
                    setVocabError(err instanceof Error ? err.message : 'Unknown error fetching vocabulary');
                }

                // Fetch context data
                try {
                    const contextResponse = await fetch(`/api/schemas/context?namespace=${namespace}`);
                    console.log('Context response status:', contextResponse.status);
                    
                    if (contextResponse.ok) {
                        const contextData = await contextResponse.json();
                        console.log('Context data:', contextData);
                        setContextData(contextData);
                    } else {
                        const errorData = await contextResponse.json();
                        console.log('Context error:', errorData);
                        setContextError(`Failed to fetch context: ${contextResponse.statusText}`);
                    }
                } catch (err) {
                    console.error('Context fetch error:', err);
                    setContextError(err instanceof Error ? err.message : 'Unknown error fetching context');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchData();
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

    return (
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">JSON-LD Context</h1>
            <p className="text-gray-700 leading-relaxed mb-6">
                This page displays the JSON-LD context for AI incident reporting.
                The context provides namespace mappings and semantic annotations for vocabulary terms.
            </p>

            {/* Context Section */}
            {contextData ? (
                <ContextSection contextData={contextData} />
            ) : (
                <NotFoundSection 
                    title="JSON-LD Context"
                    description="The JSON-LD context defines namespace mappings and semantic annotations for the vocabulary terms."
                    error={contextError || "Context not found"}
                />
            )}

            {/* Vocabulary Section - Hidden for now */}
            {false && vocabData ? (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Vocabulary Terms</h2>
                    <p className="text-gray-700 leading-relaxed mb-6">
                        This vocabulary defines the terms and properties used for AI incident reporting.
                        It includes classes, object properties, and data properties with their semantic definitions.
                    </p>

                    {vocabData.metadata && (
                        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold mb-2">Vocabulary Information</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Namespace:</strong> {vocabData.namespace}</p>
                                <p><strong>URI:</strong> <code>{vocabData.metadata.uri}</code></p>
                                <p><strong>Last Updated:</strong> {new Date(vocabData.metadata.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Group terms by type */}
                    {(() => {
                        const termsByType = vocabData.vocab['@graph'].reduce((acc, term) => {
                            const type = term['@type'];
                            if (!acc[type]) {
                                acc[type] = [];
                            }
                            acc[type].push(term);
                            return acc;
                        }, {} as Record<string, VocabTerm[]>);

                        return Object.entries(termsByType).map(([type, terms]) => (
                            <div key={type} className="mb-8">
                                <h3 className="text-xl font-semibold mb-4">
                                    {type === 'owl:Class' && 'Classes'}
                                    {type === 'owl:ObjectProperty' && 'Object Properties'}
                                    {type === 'owl:DatatypeProperty' && 'Data Properties'}
                                    {!['owl:Class', 'owl:ObjectProperty', 'owl:DatatypeProperty'].includes(type) && type}
                                </h3>
                                <div className="space-y-4">
                                    {terms.map((term) => (
                                        <VocabTermCard key={term['@id']} term={term} />
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}

                    <div className="mb-4">
                        <a 
                            href={`/api/schemas/vocab?namespace=${vocabData.namespace}`} 
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            Download Vocabulary (JSON-LD)
                        </a>
                    </div>
                </div>
            ) : false && (
                <NotFoundSection 
                    title="Vocabulary Terms"
                    description="This vocabulary defines the terms and properties used for AI incident reporting. It includes classes, object properties, and data properties with their semantic definitions."
                    error={vocabError || "Vocabulary not found"}
                />
            )}

            <div className="mt-8 pt-4 border-t border-gray-200">
                <h2 className="text-lg font-semibold mb-2">Management</h2>
                <a href="/schema/manage" className="text-blue-600 hover:text-blue-800 underline">
                    Manage Vocabulary & Context
                </a>
            </div>

            <footer className="mt-8 text-sm text-gray-500">
                Last updated {vocabData?.metadata ? new Date(vocabData.metadata.updatedAt).toLocaleDateString() : 'Unknown'}
            </footer>
        </main>
    );
}
