"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BarChart3, Database } from 'lucide-react';
import ContentForm from './ContentForm';

interface ContentStats {
  contentType: string;
  count: number;
}

export default function ContentHeader() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<ContentStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load available content types from schemas
    const loadAvailableTypes = async () => {
      try {
        const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
        
        // Load target types from both core and local namespaces
        const [coreResponse, localResponse] = await Promise.all([
          fetch(`/api/schemas/manage?namespace=core`, { method: 'PUT' }),
          fetch(`/api/schemas/manage?namespace=${namespace}`, { method: 'PUT' })
        ]);

        const allTypes: string[] = [];

        if (coreResponse.ok) {
          const coreData = await coreResponse.json();
          const coreTypes = coreData.targetTypes || [];
          allTypes.push(...coreTypes);
        }

        if (localResponse.ok) {
          const localData = await localResponse.json();
          const localTypes = localData.targetTypes || [];
          allTypes.push(...localTypes);
        }

        setAvailableTypes(allTypes);
      } catch (error) {
        console.error('Error loading content types:', error);
      }
    };

    loadAvailableTypes();
  }, []);

  useEffect(() => {
    // Load content statistics
    const loadStats = async () => {
      try {
        const response = await fetch('/api/content/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || []);
        }
      } catch (error) {
        console.error('Error loading content stats:', error);
      }
    };

    loadStats();
  }, []);

  const handleCreateSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
      const contentType = Array.isArray(formData["@type"]) ? formData["@type"][0] : formData["@type"];

      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          namespace,
          uri: formData["@id"],
          data: formData,
          sourceNode: 'local'
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        setSelectedContentType('');
        window.location.reload(); // Refresh to show new content
      } else {
        const err = await res.json();
        alert(`Creation failed: ${err.error}`);
      }
    } catch (error) {
      alert('Creation failed: Network error');
    }
    setIsLoading(false);
  };

  const totalContent = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your content across different types and namespaces
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Create New Content</DialogTitle>
              <DialogDescription>
                Select a content type and fill in the details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Content Type</label>
                <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type..." />
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

              {selectedContentType && (
                <ContentForm
                  contentType={selectedContentType}
                  onSubmit={handleCreateSubmit}
                  onCancel={() => {
                    setIsCreateDialogOpen(false);
                    setSelectedContentType('');
                  }}
                  submitButtonText={isLoading ? 'Creating...' : 'Create Content'}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Total Content</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{totalContent}</p>
          </div>

          {stats.slice(0, 3).map((stat) => (
            <div key={stat.contentType} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">{stat.contentType}</span>
              </div>
              <p className="text-xl font-bold text-gray-600 mt-2">{stat.count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 