'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FileCode, Link, ChevronDown, ChevronUp } from 'lucide-react';
import MergedContextView from './MergedContextView';
import CoreContextView from './CoreContextView';
import TargetTypeSchemaManager from './TargetTypeSchemaManager';
import CoreSchemaManager from './CoreSchemaManager';
import RelationshipManager from './RelationshipManager';

interface SchemaManagementClientProps {
    namespace: string;
    coreContext: any;
    localMergedContext: any;
}

export default function SchemaManagementClient({ 
    namespace, 
    coreContext, 
    localMergedContext 
}: SchemaManagementClientProps) {
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set([
        'merged-local-context',
        'relationships', 
        'core-context'
    ]));

    const toggleCardCollapse = (cardId: string) => {
        setCollapsedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    };

    const isCollapsed = (cardId: string) => collapsedCards.has(cardId);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your local schema, context, and vocabulary definitions alongside core schemas
                </p>
            </div>

            <div className="space-y-6">

                {/* Local Context - Merged View */}
                <Card>
                    <CardHeader>
                        <div 
                            className="flex items-center justify-between cursor-pointer" 
                            onClick={() => toggleCardCollapse('merged-local-context')}
                        >
                            <div className="flex items-center space-x-2">
                                <FileCode className="h-5 w-5" />
                                <span>Merged Local Context</span>
                                {isCollapsed('merged-local-context') ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                )}
                            </div>
                        </div>
                        <CardDescription>
                            Combined semantic mappings and vocabulary from all content types in your namespace (read-only)
                        </CardDescription>
                    </CardHeader>
                    {!isCollapsed('merged-local-context') && (
                        <CardContent>
                            <MergedContextView
                                context={localMergedContext}
                                namespace={namespace}
                            />
                        </CardContent>
                    )}
                </Card>

                {/* Target Type Schemas */}
                <TargetTypeSchemaManager namespace={namespace} />

                {/* Relationships */}
                <Card>
                    <CardHeader>
                        <div 
                            className="flex items-center justify-between cursor-pointer" 
                            onClick={() => toggleCardCollapse('relationships')}
                        >
                            <div className="flex items-center space-x-2">
                                <Link className="h-5 w-5" />
                                <span>Relationships</span>
                                {isCollapsed('relationships') ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                )}
                            </div>
                        </div>
                        <CardDescription>
                            Define relationships between different content types
                        </CardDescription>
                    </CardHeader>
                    {!isCollapsed('relationships') && (
                        <CardContent>
                            <RelationshipManager namespace={namespace} />
                        </CardContent>
                    )}
                </Card>

                {/* Core Context - Read Only */}
                <Card>
                    <CardHeader>
                        <div 
                            className="flex items-center justify-between cursor-pointer" 
                            onClick={() => toggleCardCollapse('core-context')}
                        >
                            <div className="flex items-center space-x-2">
                                <FileCode className="h-5 w-5" />
                                <span>Core Context</span>
                                {isCollapsed('core-context') ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                )}
                            </div>
                        </div>
                        <CardDescription>
                            The JSON-LD context that defines semantic mappings and vocabulary (read-only)
                        </CardDescription>
                    </CardHeader>
                    {!isCollapsed('core-context') && (
                        <CardContent>
                            <CoreContextView context={coreContext} />
                        </CardContent>
                    )}
                </Card>

                {/* Core Schema Management */}
                <CoreSchemaManager />
            </div>
        </div>
    );
}