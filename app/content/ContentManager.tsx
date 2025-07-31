"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ContentForm from './ContentForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Eye, Database, FileText } from 'lucide-react';

interface ContentRecord {
  id: string;
  uri: string;
  contentType: string;
  namespace: string;
  createdAt: string;
  updatedAt: string;
  sourceNode: string;
  data: any;
}

interface GroupedContent {
  [contentType: string]: ContentRecord[];
}

export default function ContentManager() {
  const [allContent, setAllContent] = useState<ContentRecord[]>([]);
  const [groupedContent, setGroupedContent] = useState<GroupedContent>({});
  const [editing, setEditing] = useState<ContentRecord | null>(null);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [editData, setEditData] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to extract content ID from URI
  const getContentIdFromUri = (uri: string): string => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  };

  useEffect(() => {
    // Fetch all content using the new content API
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/content');
        if (response.ok) {
          const data = await response.json();
          const contentRecords = data.content || [];
          setAllContent(contentRecords);
        } else {
          console.error('Failed to load content');
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  useEffect(() => {
    // Group content by contentType
    const grouped: GroupedContent = {};
    allContent.forEach((content) => {
      const type = content.contentType;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(content);
    });
    setGroupedContent(grouped);
  }, [allContent]);

  const startEdit = (content: ContentRecord) => {
    setEditing(content);
    setEditData(JSON.stringify(content.data, null, 2));
    setEditMode('form');
    setIsEditDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData('');
    setEditMode('form');
    setIsEditDialogOpen(false);
  };

  const handleFormSubmit = async (formData: any) => {
    if (!editing) return;

    setSaving(true);
    try {
      const contentType = Array.isArray(formData["@type"]) ? formData["@type"][0] : formData["@type"];
      
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          namespace: editing.namespace,
          uri: editing.uri,
          data: formData,
          sourceNode: editing.sourceNode
        }),
      });

      if (res.ok) {
        // Refresh the content list
        const refreshRes = await fetch('/api/content');
        const refreshData = await refreshRes.json();
        setAllContent(refreshData.content || []);
        cancelEdit();
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
      }
    } catch {
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
      const contentType = Array.isArray(json["@type"]) ? json["@type"][0] : json["@type"];
      
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          namespace: editing.namespace,
          uri: editing.uri,
          data: json,
          sourceNode: editing.sourceNode
        }),
      });

      if (res.ok) {
        // Refresh the content list
        const refreshRes = await fetch('/api/content');
        const refreshData = await refreshRes.json();
        setAllContent(refreshData.content || []);
        cancelEdit();
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
      }
    } catch {
      alert('Update failed: Network error');
    }
    setSaving(false);
  };

  const formatContentTypeName = (contentType: string) => {
    return contentType.replace(':', ': ');
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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

          {editing && (
            <div>
              {editMode === 'form' ? (
                <ContentForm
                  contentType={editing.contentType}
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
                <div className="p-4 text-center">Loading...</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {Object.keys(groupedContent).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No content found. Create your first content to get started.</p>
        </div>
      ) : (
        Object.entries(groupedContent).map(([contentType, items]) => (
          <Card key={contentType} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{formatContentTypeName(contentType)}</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
              <CardDescription>
                Content of type {contentType}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URI</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((content) => {
                      const contentId = getContentIdFromUri(content.uri);
                      const title = content.data?.title || 'No title';
                      return (
                        <TableRow key={content.id}>
                          <TableCell className="font-mono text-sm">
                            <Link
                              href={`/content/${contentId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                            >
                              {content.uri}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="max-w-xs truncate" title={title}>
                              {title}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {content.sourceNode}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(content.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/content/${contentId}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(content)}
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
} 