'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Edit } from 'lucide-react';

interface RelationshipDefinition {
    name: string;
    sourceType: string;
    targetType: string;
    cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    isRequired: boolean;
    inverseRelationship?: string;
    metadata?: Record<string, any>;
}

interface RelationshipManagerProps {
    namespace: string;
}

export default function RelationshipManager({ namespace }: RelationshipManagerProps) {
    const [relationships, setRelationships] = useState<RelationshipDefinition[]>([]);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingRelationship, setEditingRelationship] = useState<RelationshipDefinition | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState<RelationshipDefinition>({
        name: '',
        sourceType: '',
        targetType: '',
        cardinality: 'one-to-many',
        isRequired: false,
        inverseRelationship: '',
        metadata: {}
    });

    const loadRelationships = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/relationships?namespace=${encodeURIComponent(namespace)}`);
            const data = await response.json();
            
            if (data.success) {
                setRelationships(data.data);
            } else {
                setError(data.message || 'Failed to load relationships');
            }
        } catch {
            setError('Failed to load relationships');
        } finally {
            setLoading(false);
        }
    }, [namespace]);

    const loadAvailableTypes = useCallback(async () => {
        try {
            const response = await fetch(`/api/schemas/manage?namespace=${encodeURIComponent(namespace)}`, {
                method: 'PUT'
            });
            const data = await response.json();
            
            if (data.targetTypes) {
                setAvailableTypes(data.targetTypes);
            }
        } catch {
            console.error('Failed to load available types');
        }
    }, [namespace]);

    useEffect(() => {
        loadRelationships();
        loadAvailableTypes();
    }, [loadRelationships, loadAvailableTypes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.sourceType || !formData.targetType) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/relationships?namespace=${encodeURIComponent(namespace)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    inverseRelationship: formData.inverseRelationship || undefined
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                setSuccess(`Relationship ${data.data.action} successfully`);
                resetForm();
                loadRelationships();
            } else {
                setError(data.message || 'Failed to save relationship');
            }
        } catch {
            setError('Failed to save relationship');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (relationship: RelationshipDefinition) => {
        setFormData(relationship);
        setEditingRelationship(relationship);
        setShowForm(true);
    };

    const handleDelete = async (name: string, sourceType: string) => {
        if (!confirm(`Are you sure you want to delete the relationship "${name}" for type "${sourceType}"?`)) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/relationships?namespace=${encodeURIComponent(namespace)}&name=${encodeURIComponent(name)}&sourceType=${encodeURIComponent(sourceType)}`,
                { method: 'DELETE' }
            );

            const data = await response.json();
            
            if (data.success) {
                setSuccess('Relationship deleted successfully');
                loadRelationships();
            } else {
                setError(data.message || 'Failed to delete relationship');
            }
        } catch {
            setError('Failed to delete relationship');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sourceType: '',
            targetType: '',
            cardinality: 'one-to-many',
            isRequired: false,
            inverseRelationship: '',
            metadata: {}
        });
        setEditingRelationship(null);
        setShowForm(false);
    };

    const groupedRelationships = relationships.reduce((acc, rel) => {
        if (!acc[rel.sourceType]) {
            acc[rel.sourceType] = [];
        }
        acc[rel.sourceType].push(rel);
        return acc;
    }, {} as Record<string, RelationshipDefinition[]>);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Relationships - {namespace}</h2>
                <Button onClick={() => setShowForm(true)} disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Relationship
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {showForm && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingRelationship ? 'Edit Relationship' : 'Add New Relationship'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Relationship Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., reportedBy, causes, relatedTo"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="cardinality">Cardinality</Label>
                                <Select
                                    value={formData.cardinality}
                                    onValueChange={(value) => setFormData({ ...formData, cardinality: value as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one-to-one">One to One</SelectItem>
                                        <SelectItem value="one-to-many">One to Many</SelectItem>
                                        <SelectItem value="many-to-one">Many to One</SelectItem>
                                        <SelectItem value="many-to-many">Many to Many</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="sourceType">Source Type</Label>
                                <Select
                                    value={formData.sourceType}
                                    onValueChange={(value) => setFormData({ ...formData, sourceType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="targetType">Target Type</Label>
                                <Select
                                    value={formData.targetType}
                                    onValueChange={(value) => setFormData({ ...formData, targetType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="inverseRelationship">Inverse Relationship (Optional)</Label>
                                <Input
                                    id="inverseRelationship"
                                    value={formData.inverseRelationship}
                                    onChange={(e) => setFormData({ ...formData, inverseRelationship: e.target.value })}
                                    placeholder="e.g., reports, causedBy"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isRequired"
                                    checked={formData.isRequired}
                                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                />
                                <Label htmlFor="isRequired">Required Relationship</Label>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : editingRelationship ? 'Update' : 'Create'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                {Object.entries(groupedRelationships).map(([sourceType, typeRelationships]) => (
                    <Card key={sourceType} className="p-4">
                        <h3 className="text-lg font-semibold mb-3">{sourceType}</h3>
                        <div className="space-y-2">
                            {typeRelationships.map((relationship) => (
                                <div key={`${relationship.name}-${relationship.sourceType}`} className="flex items-center justify-between p-3 border rounded">
                                    <div className="flex-1">
                                        <div className="font-medium">{relationship.name}</div>
                                        <div className="text-sm text-gray-600">
                                            {relationship.sourceType} → {relationship.targetType} ({relationship.cardinality})
                                            {relationship.isRequired && <span className="text-red-500 ml-2">Required</span>}
                                            {relationship.inverseRelationship && (
                                                <span className="text-blue-500 ml-2">↔ {relationship.inverseRelationship}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(relationship)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(relationship.name, relationship.sourceType)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>

            {relationships.length === 0 && !loading && (
                <Card className="p-6 text-center">
                    <p className="text-gray-500">No relationships defined yet. Create your first relationship to get started.</p>
                </Card>
            )}
        </div>
    );
}