"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import IncidentForm from '../IncidentForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Eye } from 'lucide-react';

interface IncidentRecord {
  id: string;
  uri: string;
  createdAt: string;
  sourceNode: string;
  data: any;
}

export default function IncidentManager() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [grouped, setGrouped] = useState<Record<string, IncidentRecord[]>>({});
  const [editing, setEditing] = useState<IncidentRecord | null>(null);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [editData, setEditData] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [schema, setSchema] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to extract incident ID from URI
  const getIncidentIdFromUri = (uri: string): string => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  };

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((data: IncidentRecord[]) => setIncidents(data))
      .catch(() => alert('Failed to load incidents'));
  }, []);

  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => setSchema(data))
      .catch(() => alert('Failed to load schema'));
  }, []);

  useEffect(() => {
    const g: Record<string, IncidentRecord[]> = {};
    incidents.forEach((inc) => {
      const key = inc.sourceNode || 'local';
      if (!g[key]) g[key] = [];
      g[key].push(inc);
    });
    setGrouped(g);
  }, [incidents]);

  const startEdit = (inc: IncidentRecord) => {
    setEditing(inc);
    setEditData(JSON.stringify(inc.data, null, 2));
    setEditMode('form');
    setIsEditDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData('');
    setEditMode('form');
    setIsEditDialogOpen(false);
  };

  const handleCreateSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newIncident = await res.json();
        setIncidents((prev) => [...prev, newIncident]);
        setIsCreateDialogOpen(false);
      } else {
        const err = await res.json();
        alert(`Creation failed: ${err.error}`);
      }
    } catch (error) {
      alert('Creation failed: Network error');
    }
    setIsLoading(false);
  };

  const handleFormSubmit = async (formData: any) => {
    if (!editing) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) => prev.map((i) => (i.id === editing.id ? { ...i, data: updated } : i)));
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
    if (!editing) return;

    let json;
    try {
      json = JSON.parse(editData);
    } catch {
      alert('Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) => prev.map((i) => (i.id === editing.id ? { ...i, data: updated } : i)));
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

  return (
    <div className="space-y-6">

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <DialogDescription>
              Modify the incident details below
            </DialogDescription>
            <div className="flex space-x-2 mt-4">
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

          {editing && (
            <div>
              {editMode === 'form' && schema ? (
                <IncidentForm
                  schema={schema}
                  initialData={editing.data}
                  onSubmit={handleFormSubmit}
                  onCancel={cancelEdit}
                  submitButtonText={saving ? 'Saving...' : 'Save Changes'}
                  mode="edit"
                />
              ) : editMode === 'json' ? (
                <div className="space-y-4">
                  <textarea
                    className="w-full h-64 border p-2 font-mono text-sm rounded-md"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
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
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">Loading schema...</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No incidents found. Create your first incident to get started.</p>
        </div>
      ) : (
        (Object.entries(grouped) as [string, IncidentRecord[]][]).map(([source, items]) => (
          <div key={source} className="space-y-4">
            <h3 className="text-lg font-medium">
              {source === 'local' ? 'Local Incidents' : source}
            </h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URI</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((inc) => {
                    const incidentId = getIncidentIdFromUri(inc.uri);
                    const title = inc.data?.title || 'No title';
                    return (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/incidents/${incidentId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                          >
                            {inc.uri}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(inc.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-xs truncate" title={title}>
                            {title}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/incidents/${incidentId}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(inc)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
