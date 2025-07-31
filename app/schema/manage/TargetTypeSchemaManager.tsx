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
import TargetTypeSchemaEditor from './TargetTypeSchemaEditor';
import ContentTypeContextEditor from './ContentTypeContextEditor';

interface TargetTypeSchemaManagerProps {
    namespace: string;
}

interface TargetTypeSchema {
    targetType: string;
    schema: SchemaObject | null;
    context: SchemaObject | null;
}

export default function TargetTypeSchemaManager({ namespace }: TargetTypeSchemaManagerProps) {
    const [, setTargetTypes] = useState<string[]>([]);
    const [schemas, setSchemas] = useState<TargetTypeSchema[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTargetType, setEditingTargetType] = useState<string | null>(null);
    const [editingContextTargetType, setEditingContextTargetType] = useState<string | null>(null);
    const [newTargetType, setNewTargetType] = useState('');
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

    const loadTargetTypes = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/schemas/manage?namespace=${namespace}`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                const data = await response.json();
                const types = data.targetTypes || [];
                setTargetTypes(types);
                
                // Load schemas and contexts for each target type
                const schemasData = await Promise.all(
                    types.map(async (targetType: string) => {
                        const schema = await loadSchemaForTargetType(targetType);
                        const context = await loadContextForTargetType(targetType);
                        return { targetType, schema, context };
                    })
                );
                
                setSchemas(schemasData);
                
                // Start all cards collapsed
                setCollapsedCards(new Set(types));
            }
        } catch (error) {
            console.error('Error loading content types:', error);
        } finally {
            setIsLoading(false);
        }
    }, [namespace]);

    useEffect(() => {
        loadTargetTypes();
    }, [loadTargetTypes]);

    const loadSchemaForTargetType = async (targetType: string): Promise<SchemaObject | null> => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=${namespace}&type=validation&targetType=${encodeURIComponent(targetType)}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.schema;
            }
            return null;
        } catch (error) {
            console.error(`Error loading schema for ${targetType}:`, error);
            return null;
        }
    };

    const loadContextForTargetType = async (targetType: string): Promise<SchemaObject | null> => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=${namespace}&type=context&targetType=${encodeURIComponent(targetType)}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.schema;
            }
            return null;
        } catch (error) {
            console.error(`Error loading context for ${targetType}:`, error);
            return null;
        }
    };

    const handleAddTargetType = async () => {
        if (!newTargetType.trim()) return;
        
        // Automatically prepend the namespace to the target type
        const fullTargetType = `${namespace}:${newTargetType.trim()}`;
        
        const defaultSchema: SchemaObject = {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/schemas/${namespace}/${newTargetType.toLowerCase()}-schema.json`,
            title: `${newTargetType} Schema`,
            type: "object",
            required: ["@id", "@type"],
            properties: {
                "@context": {
                    type: "array",
                    items: { type: "string", format: "uri" }
                },
                "@type": {
                    type: "array",
                    items: { type: "string", format: "uri" }
                },
                "@id": {
                    type: "string",
                    format: "uri"
                }
            },
            additionalProperties: false,
        };

        try {
            const response = await fetch('/api/schemas/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace,
                    type: 'validation',
                    targetType: fullTargetType,
                    schema: defaultSchema
                })
            });

            if (response.ok) {
                setNewTargetType('');
                setIsAddDialogOpen(false);
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error adding content type:', error);
        }
    };

    const handleDeleteTargetType = async (targetType: string) => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=${namespace}&type=validation&targetType=${encodeURIComponent(targetType)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error deleting content type:', error);
        }
    };

    const handleUpdateSchema = async (targetType: string, schema: SchemaObject) => {
        try {
            const response = await fetch('/api/schemas/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    namespace,
                    type: 'validation',
                    targetType,
                    schema
                })
            });

            if (response.ok) {
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error updating schema:', error);
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
                    namespace,
                    type: 'context',
                    targetType,
                    schema: context
                })
            });

            if (response.ok) {
                loadTargetTypes();
            }
        } catch (error) {
            console.error('Error updating context:', error);
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
            <Card>
                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Content Types</span>
                </CardTitle>
                <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Content Types</span>
                </CardTitle>
                <CardDescription>
                    Manage validation and context schemas for specific content types (e.g., Incident, Report will be prefixed with {namespace}:)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Content Type
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Content Type</DialogTitle>
                                    <DialogDescription>
                                        Create a new validation schema for a specific content type
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="targetType">Content Type Name</Label>
                                        <Input
                                            id="targetType"
                                            placeholder="e.g., Incident, Report, Analysis"
                                            value={newTargetType}
                                            onChange={(e) => setNewTargetType(e.target.value)}
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Will be created as {namespace}:{newTargetType || 'YourTypeName'}
                                        </p>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAddTargetType}>
                                            Add Content Type
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {schemas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No content type schemas found</p>
                            <p className="text-sm">Add a content type to get started</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {schemas.map(({ targetType, schema, context }) => {
                                const isCollapsed = collapsedCards.has(targetType);
                                return (
                                <Card key={targetType} className="border-l-4 border-l-blue-500">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div 
                                                className="flex-1 cursor-pointer" 
                                                onClick={() => toggleCardCollapse(targetType)}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <CardTitle className="text-lg">{targetType}</CardTitle>
                                                    
                                                    {/* Status badges */}
                                                    <div className="flex items-center space-x-1">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            schema 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            <Database className="h-3 w-3 mr-1" />
                                                            Schema
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            context 
                                                                ? 'bg-blue-100 text-blue-700' 
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            <FileCode className="h-3 w-3 mr-1" />
                                                            Context
                                                        </span>
                                                    </div>
                                                    
                                                    {isCollapsed ? (
                                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </div>
                                                <CardDescription>
                                                    {schema ? 'Schema configured' : 'No schema found'}
                                                    {context && ' • Context configured'}
                                                </CardDescription>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingTargetType(targetType)}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Schema
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingContextTargetType(targetType)}
                                                >
                                                    <FileCode className="h-4 w-4 mr-2" />
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
                                                                This will permanently delete the validation schema for content type {targetType}.
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
                                    {!isCollapsed && (schema || context) && (
                                        <CardContent>
                                            <div className="space-y-4">
                                                {schema && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2">Validation Schema</h4>
                                                        <div className="bg-gray-50 p-4 rounded-lg">
                                                            <pre className="text-sm text-gray-700 overflow-x-auto">
                                                                {JSON.stringify(schema, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                                {context && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2">JSON-LD Context</h4>
                                                        <div className="bg-gray-50 p-4 rounded-lg">
                                                            <pre className="text-sm text-gray-700 overflow-x-auto">
                                                                {JSON.stringify(context, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Edit Schema Dialog */}
                {editingTargetType && (
                    <Dialog open={true} onOpenChange={() => setEditingTargetType(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Schema for {editingTargetType}</DialogTitle>
                                <DialogDescription>
                                    Modify the validation schema for this content type
                                </DialogDescription>
                            </DialogHeader>
                            <TargetTypeSchemaEditor
                                initialSchema={schemas.find(s => s.targetType === editingTargetType)?.schema || null}
                                onSave={(schema: SchemaObject) => {
                                    handleUpdateSchema(editingTargetType, schema);
                                    setEditingTargetType(null);
                                }}
                                onCancel={() => setEditingTargetType(null)}
                            />
                        </DialogContent>
                    </Dialog>
                )}

                {/* Edit Context Dialog */}
                {editingContextTargetType && (
                    <Dialog open={true} onOpenChange={() => setEditingContextTargetType(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit JSON-LD Context for {editingContextTargetType}</DialogTitle>
                                <DialogDescription>
                                    Define semantic mappings specific to this content type
                                </DialogDescription>
                            </DialogHeader>
                            <ContentTypeContextEditor
                                initialContext={schemas.find(s => s.targetType === editingContextTargetType)?.context || null}
                                targetType={editingContextTargetType}
                                namespace={namespace}
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