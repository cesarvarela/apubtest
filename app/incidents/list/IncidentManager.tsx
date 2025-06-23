"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import IncidentForm from '../IncidentForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  // Helper function to extract incident ID from URI
  const getIncidentIdFromUri = (uri: string): string => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  };

  // Load incidents
  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((data: IncidentRecord[]) => setIncidents(data))
      .catch(() => alert('Failed to load incidents'));
  }, []);

  // Load schema
  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => setSchema(data))
      .catch(() => alert('Failed to load schema'));
  }, []);

  // Group by sourceNode
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
    setEditMode('form'); // Default to form mode
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData('');
    setEditMode('form');
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
      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-4/5 max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Incident</h2>
                <div className="flex space-x-2">
                  <button
                    className={`px-3 py-1 rounded ${editMode === 'form' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setEditMode('form')}
                  >
                    Form Edit
                  </button>
                  <button
                    className={`px-3 py-1 rounded ${editMode === 'json' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setEditMode('json')}
                  >
                    JSON Edit
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4">
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
                <div>
                  <textarea
                    className="w-full h-64 border p-2 mb-2 font-mono text-sm"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={saveJsonEdit}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">Loading schema...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incidents Table */}
      {(Object.entries(grouped) as [string, IncidentRecord[]][]).map(([source, items]) => (
        <div key={source} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {source === 'local' ? 'Local Incidents' : source}
          </h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URI</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inc) => {
                  const incidentId = getIncidentIdFromUri(inc.uri);
                  const title = inc.data?.title || 'No title';
                  return (
                    <TableRow key={inc.id}>
                      <TableCell>
                        <Link 
                          href={`/incidents/${incidentId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                        >
                          {inc.uri}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {new Date(inc.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={title}>
                          {title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm space-x-3">
                        <Link 
                          href={`/incidents/${incidentId}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </Link>
                        <button 
                          className="text-green-600 hover:text-green-800 font-medium" 
                          onClick={() => startEdit(inc)}
                        >
                          Edit
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
