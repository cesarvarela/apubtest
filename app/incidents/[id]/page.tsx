"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IncidentForm from '../IncidentForm';

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
    fetch('/api/schema')
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
    if (!confirm('Are you sure you want to delete this incident?')) return;
    
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        router.push('/incidents/list');
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.error}`);
      }
    } catch (error) {
      alert('Delete failed: Network error');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading incident...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
        <div className="mt-4">
          <button 
            onClick={() => router.push('/incidents/list')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Incidents List
          </button>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Incident not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
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
                  initialData={incident.data}
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

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Incident Details</h1>
            <p className="text-gray-600 break-all">{incident.uri}</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => router.push('/incidents/list')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to List
            </button>
            <button 
              onClick={startEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
            <button 
              onClick={deleteIncident}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Incident Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Type:</span> {incident.data["@type"]}
              </div>
              <div>
                <span className="font-medium">Context:</span> 
                <span className="text-sm text-gray-600 break-all ml-2">
                  {incident.data["@context"]}
                </span>
              </div>
              <div>
                <span className="font-medium">Source Node:</span> {incident.sourceNode}
              </div>
            </div>
          </div>
          
          {/* Extract key fields from incident data */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Information</h3>
            <div className="space-y-2">
              {incident.data.title && (
                <div>
                  <span className="font-medium">Title:</span> {incident.data.title}
                </div>
              )}
              {incident.data.description && (
                <div>
                  <span className="font-medium">Description:</span> 
                  <p className="text-sm text-gray-700 mt-1">{incident.data.description}</p>
                </div>
              )}
              {incident.data.date && (
                <div>
                  <span className="font-medium">Date:</span> {incident.data.date}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full JSON Data */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Full Data</h3>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="font-mono text-sm whitespace-pre-wrap overflow-auto">
              {JSON.stringify(incident.data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}