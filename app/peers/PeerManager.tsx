"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Server, ExternalLink } from 'lucide-react';

type Peer = { id: string; baseUrl: string; outbox: string };

interface PeerManagerProps { 
  initialPeers: Peer[]; 
}

export default function PeerManager({ initialPeers }: PeerManagerProps) {
  const [peers, setPeers] = useState<Peer[]>(initialPeers);
  const [baseUrl, setBaseUrl] = useState('');
  const [outbox, setOutbox] = useState('');
  const [editingPeer, setEditingPeer] = useState<Peer | null>(null);
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editOutbox, setEditOutbox] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const addPeer = async () => {
    if (!baseUrl || !outbox) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/peers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, outbox }),
      });
      
      if (res.ok) {
        const newPeer = await res.json();
        setPeers((prev) => [...prev, newPeer]);
        setBaseUrl('');
        setOutbox('');
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to add peer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePeer = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/peers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPeers((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete peer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (peer: Peer) => {
    setEditingPeer(peer);
    setEditBaseUrl(peer.baseUrl);
    setEditOutbox(peer.outbox);
    setIsEditDialogOpen(true);
  };

  const saveEditing = async () => {
    if (!editingPeer || !editBaseUrl || !editOutbox) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/peers/${editingPeer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: editBaseUrl, outbox: editOutbox }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setPeers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setIsEditDialogOpen(false);
        setEditingPeer(null);
      }
    } catch (error) {
      console.error('Failed to update peer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Peer Section */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Peer Connections</h3>
          <p className="text-sm text-muted-foreground">
            {peers.length} peer{peers.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Peer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Peer</DialogTitle>
              <DialogDescription>
                Enter the details for the new ActivityPub peer you want to connect to.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://example.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="outbox">Outbox URL</Label>
                <Input
                  id="outbox"
                  placeholder="https://example.com/outbox"
                  value={outbox}
                  onChange={(e) => setOutbox(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addPeer} 
                disabled={!baseUrl || !outbox || isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Peer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Peers Table */}
      {peers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No peers connected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by adding your first ActivityPub peer connection.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Peer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Base URL</TableHead>
                <TableHead>Outbox</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map((peer) => (
                <TableRow key={peer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span>{peer.baseUrl}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={peer.baseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{peer.outbox}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={peer.outbox} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(peer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Peer</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this peer connection? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deletePeer(peer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Peer</DialogTitle>
            <DialogDescription>
              Update the details for this ActivityPub peer connection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editBaseUrl">Base URL</Label>
              <Input
                id="editBaseUrl"
                value={editBaseUrl}
                onChange={(e) => setEditBaseUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editOutbox">Outbox URL</Label>
              <Input
                id="editOutbox"
                value={editOutbox}
                onChange={(e) => setEditOutbox(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveEditing} 
              disabled={!editBaseUrl || !editOutbox || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
