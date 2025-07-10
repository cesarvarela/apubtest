'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Calendar, Globe, User, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContentForm from '../ContentForm';

interface ContentData {
  [key: string]: any;
}

interface ContentRecord {
  id: string;
  uri: string;
  contentType: string;
  namespace: string;
  createdAt: string;
  updatedAt: string;
  sourceNode: string;
  data: ContentData;
}

export default function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [editData, setEditData] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [contentId, setContentId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setContentId(decodeURIComponent(resolvedParams.id));
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!contentId) return; 

    const loadContent = async () => {
      setLoading(true);
      try {

        let response = await fetch(`/api/content?uri=${encodeURIComponent(contentId)}`);
        
        if (!response.ok) {

          const constructedUri = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/content/${contentId}`;
          response = await fetch(`/api/content?uri=${encodeURIComponent(constructedUri)}`);
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Content not found');
          }
          throw new Error('Failed to load content');
        }

        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [contentId]);

  const startEdit = () => {
    if (!content) return;
    setEditing(true);
    setEditData(JSON.stringify(content.data, null, 2));
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData('');
  };

  const handleFormSubmit = async (formData: any) => {
    if (!content) return;

    setSaving(true);
    try {
      const contentType = Array.isArray(formData["@type"]) ? formData["@type"][0] : formData["@type"];
      
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          namespace: content.namespace,
          uri: content.uri,
          data: formData,
          sourceNode: content.sourceNode
        }),
      });

      if (res.ok) {
        setContent({
          ...content,
          data: formData,
          updatedAt: new Date().toISOString()
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
    if (!content) return;

    let json;
    try {
      json = JSON.parse(editData);
    } catch {
      alert('Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const contentType = Array.isArray(json["@type"]) ? json["@type"][0] : json["@type"];
      
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          namespace: content.namespace,
          uri: content.uri,
          data: json,
          sourceNode: content.sourceNode
        }),
      });

      if (res.ok) {
        setContent({
          ...content,
          data: json,
          updatedAt: new Date().toISOString()
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

  const formatContentTypeName = (contentType: string) => {
    return contentType.replace(':', ': ');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-center text-gray-600">Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => router.back()} 
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/content">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Content
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{content.data.title || 'Untitled Content'}</h1>
            <p className="text-gray-600">{formatContentTypeName(content.contentType)}</p>
          </div>
        </div>
        <Button onClick={startEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Content Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Type</span>
            </div>
            <Badge variant="secondary" className="mt-2">
              {formatContentTypeName(content.contentType)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Source</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{content.sourceNode}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Created</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {new Date(content.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Namespace</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{content.namespace}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Data */}
      <Card>
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
          <CardDescription>
            URI: <code className="bg-gray-100 px-1 rounded text-xs">{content.uri}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(content.data, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Modify the content details below
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

          <div>
            {editMode === 'form' ? (
              <ContentForm
                contentType={content.contentType}
                initialData={content.data}
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
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 