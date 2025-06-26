"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Loader2, ExternalLink } from 'lucide-react';
import IncidentForm from '../IncidentForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface IncidentData {
  "@id": string;
  "@type": string;
  "@context": string;
  [key: string]: any;
}

interface IncidentRecord {
  id: string;
  uri: string;
  createdAt: string;
  sourceNode: string;
  data: IncidentData;
}

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<string>('');
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [schema, setSchema] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [incidentId, setIncidentId] = useState<string>('');
  const router = useRouter();

  // Handle params (could be Promise in Next.js 13+)
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setIncidentId(decodeURIComponent(resolvedParams.id));
    };
    resolveParams();
  }, [params]);

  // Load incident
  useEffect(() => {
    if (!incidentId) return; // Wait for incidentId to be set

    fetch(`/api/incidents/${encodeURIComponent(incidentId)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Incident not found');
          }
          throw new Error('Failed to load incident');
        }
        return res.json();
      })
      .then((data: IncidentData) => {
        // The API returns just the data, so we need to construct the full record
        const record: IncidentRecord = {
          id: incidentId,
          uri: incidentId,
          createdAt: new Date().toISOString(), // We don't have this from the API
          sourceNode: 'unknown', // We don't have this from the API
          data: data
        };
        setIncident(record);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [incidentId]);

  // Load schema for form editing
  useEffect(() => {
    const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
    fetch(`/api/schemas/validation?namespace=${namespace}&merged=true`)
      .then((res) => res.json())
      .then((schemaData) => setSchema(schemaData))
      .catch((err) => console.error('Failed to load schema:', err));
  }, []);

  const startEdit = () => {
    if (!incident) return;
    setEditing(true);
    setEditData(JSON.stringify(incident.data, null, 2));
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData('');
  };

  const handleFormSubmit = async (formData: any) => {
    if (!incident) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncident({
          ...incident,
          data: updated
        });
        cancelEdit();
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
      }
    } catch (error) {
      alert('Update failed: Network error');
    }
    setSaving(false);
  };

  const saveJsonEdit = async () => {
    if (!incident) return;

    let json;
    try {
      json = JSON.parse(editData);
    } catch {
      alert('Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncident({
          ...incident,
          data: updated
        });
        cancelEdit();
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
      }
    } catch (error) {
      alert('Update failed: Network error');
    }
    setSaving(false);
  };

  const deleteIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/incidents');
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.error}`);
      }
    } catch (error) {
      alert('Delete failed: Network error');
    }
  };

  const isSystemField = (key: string) => {
    return key.startsWith('@') || ['id', 'uri', 'createdAt', 'sourceNode'].includes(key);
  };

  const formatPropertyValue = (key: string, value: any, propertySchema?: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">empty array</span>;
      }
      return (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={index} className="pl-4 border-l-2 border-muted">
              {typeof item === 'object' ? (
                <div className="rounded-md bg-muted/30 p-2">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              ) : (
                <span className="text-sm">{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="rounded-md bg-muted/50 p-3">
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      );
    }

    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all text-sm inline-flex items-center gap-1"
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return (
            <span className="font-mono text-sm">
              {date.toLocaleString()}
            </span>
          );
        }
      } catch {
        // Fall through to default string handling
      }
    }

    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{value}</p>
        </div>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  const getPropertyInfo = (key: string) => {
    if (!schema || !schema.properties) return null;

    const prop = schema.properties[key];
    if (!prop) return null;

    return {
      type: prop.type,
      format: prop.format,
      description: prop.description,
      required: schema.required && schema.required.includes(key)
    };
  };

  const groupProperties = (data: any) => {
    const systemProps: [string, any][] = [];
    const contentProps: [string, any][] = [];
    const otherProps: [string, any][] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (isSystemField(key)) {
        systemProps.push([key, value]);
      } else {
        const propInfo = getPropertyInfo(key);
        if (propInfo?.required || ['title', 'description', 'name', 'headline', 'summary'].includes(key.toLowerCase())) {
          contentProps.push([key, value]);
        } else {
          otherProps.push([key, value]);
        }
      }
    });

    return { systemProps, contentProps, otherProps };
  };

  const renderPropertySection = (title: string, properties: [string, any][], emptyMessage?: string) => {
    if (properties.length === 0) {
      return emptyMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Badge variant="secondary">{properties.length} properties</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {properties.map(([key, value]) => {
            const propInfo = getPropertyInfo(key);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {key}
                  </span>
                  {propInfo?.required && (
                    <Badge variant="outline" className="text-xs">required</Badge>
                  )}
                  {propInfo?.type && (
                    <Badge variant="outline" className="text-xs">{propInfo.type}</Badge>
                  )}
                </div>
                <div className="pl-2">
                  {formatPropertyValue(key, value, propInfo)}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading incident...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive mb-4">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
            <Button onClick={() => router.push('/incidents')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Incidents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Incident not found
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { systemProps, contentProps, otherProps } = groupProperties(incident.data);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <div className="flex space-x-2">
              <Button
                variant={editMode === 'form' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('form')}
              >
                Form Edit
              </Button>
              <Button
                variant={editMode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('json')}
              >
                JSON Edit
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {editMode === 'form' && schema ? (
              <IncidentForm
                schema={schema}
                initialData={incident.data}
                onSubmit={handleFormSubmit}
                onCancel={cancelEdit}
                submitButtonText={saving ? 'Saving...' : 'Save Changes'}
                mode="edit"
              />
            ) : editMode === 'json' ? (
              <div className="space-y-4">
                <textarea
                  className="w-full h-64 border rounded-md p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  placeholder="Edit incident JSON data..."
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveJsonEdit}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading schema...</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Incident Details</h1>
          <p className="text-sm text-muted-foreground break-all font-mono">
            {incident.uri}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/incidents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <Button onClick={startEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Incident</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this incident? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteIncident} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6">

        {renderPropertySection("System Properties", systemProps)}

        {renderPropertySection("Content", contentProps, "No content properties defined")}

        {renderPropertySection("Additional Properties", otherProps)}

        <Card>
          <CardHeader>
            <CardTitle>Raw JSON Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4 overflow-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(incident.data, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
