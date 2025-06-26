"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import IncidentForm from './IncidentForm';

export default function IncidentHeader() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [schema, setSchema] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get namespace from environment or default to 'local' 
    const namespace = process.env.NEXT_PUBLIC_NAMESPACE || 'local';
    fetch(`/api/schemas/validation?namespace=${namespace}&merged=true`)
      .then((res) => res.json())
      .then((data) => setSchema(data))
      .catch(() => alert('Failed to load schema'));
  }, []);

  const handleCreateSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setIsCreateDialogOpen(false);
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Creation failed: ${err.error}`);
      }
    } catch (error) {
      alert('Creation failed: Network error');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all reported incidents
        </p>
      </div>
      
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Incident</DialogTitle>
            <DialogDescription>
              Fill out the form below to create a new incident
            </DialogDescription>
          </DialogHeader>
          {schema ? (
            <IncidentForm
              schema={schema}
              onSubmit={handleCreateSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
              submitButtonText={isLoading ? 'Creating...' : 'Create'}
              mode="create"
            />
          ) : (
            <div className="p-4 text-center">Loading schema...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
