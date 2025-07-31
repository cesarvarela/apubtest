'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Database, FileCode, ChevronDown, ChevronUp } from 'lucide-react';
import { SchemaObject } from 'ajv';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ContentTypeContextEditor from './ContentTypeContextEditor';

interface CoreSchemaManagerProps {
    className?: string;
}

interface CoreSchemaType {
    targetType: string;
    schema: SchemaObject | null;
    context: SchemaObject | null;
}

export default function CoreSchemaManager({ className }: CoreSchemaManagerProps) {
    const [, setTargetTypes] = useState<string[]>([]);
    const [schemas, setSchemas] = useState<CoreSchemaType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingContextTargetType, setEditingContextTargetType] = useState<string | null>(null);
    const [newTargetType, setNewTargetType] = useState('');
    const [newSchemaJson, setNewSchemaJson] = useState('{\n  "@context": {\n    "@protected": true,\n    \n    "core": "https://example.org/core#",\n    "schema": "https://schema.org/",\n    "xsd": "http://www.w3.org/2001/XMLSchema#"\n    \n  }\n}');
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

    const loadTargetTypes = useCallback(async () => {
        try {
            setIsLoading(true);
            
            // Get context target types from the API
            const response = await fetch(`/api/schemas/manage?namespace=core&type=context`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                const data = await response.json();
                const types = data.targetTypes || [];
                setTargetTypes(types);
                
                // Load contexts for each target type
                const schemasData = await Promise.all(
                    types.map(async (targetType: string) => {
                        const context = await loadContextForTargetType(targetType);
                        return { 
                            targetType, 
                            schema: null, // This component is context-only
                            context 
                        };
                    })
                );
                
                setSchemas(schemasData);
                
                // Start all cards collapsed
                setCollapsedCards(new Set(types));
            } else {
                setTargetTypes([]);
                setSchemas([]);
            }
        } catch (error) {
            console.error('Error loading core context types:', error);
            setTargetTypes([]);
            setSchemas([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTargetTypes();
    }, [loadTargetTypes]);


    const loadContextForTargetType = async (targetType: string): Promise<SchemaObject | null> => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=core&type=context&targetType=${encodeURIComponent(targetType)}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.schema;
            }
            return null;
        } catch (error) {
            console.error(`Error loading core context for ${targetType}:`, error);
            return null;
        }
    };

    const handleAddTargetType = async () => {
        if (!newTargetType.trim() || !newSchemaJson.trim()) return;
        
        // Core schemas use the "core" namespace prefix
        const fullTargetType = `core:${newTargetType.trim()}`;
        
        try {
            const schema = JSON.parse(newSchemaJson);
            
            const response = await fetch('/api/schemas/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace: 'core',
                    type: 'context',
                    targetType: fullTargetType,
                    schema: schema
                })
            });

            if (response.ok) {
                setNewTargetType('');
                setNewSchemaJson('{\n  "@context": {\n    "@protected": true,\n    \n    "core": "https://example.org/core#",\n    "schema": "https://schema.org/",\n    "xsd": "http://www.w3.org/2001/XMLSchema#"\n    \n  }\n}');
                setIsAddDialogOpen(false);
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error adding core context type:', error);
        }
    };

    const handleDeleteTargetType = async (targetType: string) => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=core&type=context&targetType=${encodeURIComponent(targetType)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error deleting core context type:', error);
        }
    };


    const handleUpdateContext = async (targetType: string, context: SchemaObject) => {
        try {
            const response = await fetch('/api/schemas/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace: 'core',
                    type: 'context',
                    targetType,
                    schema: context
                })
            });

            if (response.ok) {
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error updating core context:', error);
        }
    };

    const toggleCardCollapse = (targetType: string) => {
        setCollapsedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(targetType)) {
                newSet.delete(targetType);
            } else {
                newSet.add(targetType);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Core Schema Types</span>
                    </CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5" />
                    <span>Core Context Types</span>
                </CardTitle>
                <CardDescription>
                    Manage core JSON-LD contexts (e.g., Incident, Report will be prefixed with core:)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Core Context Types</h3>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Core Type
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Core Schema Type</DialogTitle>
                                    <DialogDescription>
                                        Create a new core validation schema for a specific type
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="targetType">Core Type Name</Label>
                                        <Input
                                            id="targetType"
                                            placeholder="e.g., Incident, Report, Analysis"
                                            value={newTargetType}
                                            onChange={(e) => setNewTargetType(e.target.value)}
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Will be created as core:{newTargetType || 'YourTypeName'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="schemaJson">JSON Context</Label>
                                        <textarea
                                            id="schemaJson"
                                            placeholder="Enter your JSON context definition..."
                                            value={newSchemaJson}
                                            onChange={(e) => setNewSchemaJson(e.target.value)}
                                            className="w-full min-h-[300px] p-3 font-mono text-sm border border-input rounded-md bg-background resize-vertical focus:ring-2 focus:ring-ring focus:outline-none"
                                            spellCheck={false}
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Enter a valid JSON Context definition
                                        </p>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => {
                                            setIsAddDialogOpen(false);
                                            setNewTargetType('');
                                            setNewSchemaJson('{\n  "@context": {\n    "@protected": true,\n    \n    "core": "https://example.org/core#",\n    "schema": "https://schema.org/",\n    "xsd": "http://www.w3.org/2001/XMLSchema#"\n    \n  }\n}');
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAddTargetType}>
                                            Add Core Type
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {schemas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No core schema types found</p>
                            <p className="text-sm">Add a core type to get started</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {schemas.map(({ targetType, context }) => {
                                const isCollapsed = collapsedCards.has(targetType);
                                return (
                                <Card key={targetType} className="border-l-4 border-l-purple-500">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div 
                                                className="flex-1 cursor-pointer" 
                                                onClick={() => toggleCardCollapse(targetType)}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <CardTitle className="text-lg">{targetType}</CardTitle>
                                                    
                                                    {/* Status badge for context */}
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        context 
                                                            ? 'bg-purple-100 text-purple-700' 
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        <FileCode className="h-3 w-3 mr-1" />
                                                        Core Context
                                                    </span>
                                                    
                                                    {isCollapsed ? (
                                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </div>
                                                <CardDescription>
                                                    {context ? 'Context configured' : 'No context found'}
                                                </CardDescription>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingContextTargetType(targetType)}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Context
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete the core context for type {targetType}.
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteTargetType(targetType)}>
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {!isCollapsed && context && (
                                        <CardContent>
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">JSON-LD Context</h4>
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <pre className="text-sm text-gray-700 overflow-x-auto">
                                                        {JSON.stringify(context, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                                );
                            })}
                        </div>
                    )}
                </div>


                {/* Edit Context Dialog */}
                {editingContextTargetType && (
                    <Dialog open={true} onOpenChange={() => setEditingContextTargetType(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Core JSON-LD Context for {editingContextTargetType}</DialogTitle>
                                <DialogDescription>
                                    Define core semantic mappings for this type
                                </DialogDescription>
                            </DialogHeader>
                            <ContentTypeContextEditor
                                initialContext={schemas.find(s => s.targetType === editingContextTargetType)?.context || null}
                                targetType={editingContextTargetType}
                                namespace="core"
                                onSave={(context: SchemaObject) => {
                                    handleUpdateContext(editingContextTargetType, context);
                                    setEditingContextTargetType(null);
                                }}
                                onCancel={() => setEditingContextTargetType(null)}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </CardContent>
        </Card>
    );
}