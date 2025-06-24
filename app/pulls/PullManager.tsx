"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, History, AlertCircle, CheckCircle, Clock, Server } from 'lucide-react';

interface Peer { id: string; baseUrl: string }
interface PullRecord { 
  id: string; 
  status: string; 
  startedAt: string; 
  completedAt: string | null; 
  incidentsFound: string; 
  incidentsProcessed: string; 
  incidentsCreated: string; 
  incidentsUpdated: string; 
  errorMessage?: string;
}

interface PullManagerProps { 
  initialPeers: Peer[];
}

export default function PullManager({ initialPeers }: PullManagerProps) {
  const [peers] = useState<Peer[]>(initialPeers);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [history, setHistory] = useState<PullRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pulling, setPulling] = useState(false);

  const fetchHistory = async (peerId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/pulls/${peerId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        console.error('Failed to load pull history');
      }
    } catch (error) {
      console.error('Failed to load pull history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const initiatePull = async () => {
    if (!selectedPeer) return;
    setPulling(true);
    try {
      const res = await fetch(`/api/pulls/${selectedPeer}`, { method: 'POST' });
      if (res.ok) {
        await fetchHistory(selectedPeer);
      } else {
        const err = await res.json();
        console.error(`Pull failed: ${err.error}`);
      }
    } catch (error) {
      console.error('Pull failed:', error);
    } finally {
      setPulling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>;
      case 'running':
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Running
        </Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const selectedPeerData = peers.find(p => p.id === selectedPeer);

  return (
    <div className="space-y-6">
      {/* Peer Selection and Pull Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Select Peer</label>
          <Select value={selectedPeer || ''} onValueChange={(value) => {
            setSelectedPeer(value);
            if (value) {
              fetchHistory(value);
            }
          }}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Choose a peer to pull from" />
            </SelectTrigger>
            <SelectContent>
              {peers.map((peer) => (
                <SelectItem key={peer.id} value={peer.id}>
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span>{peer.baseUrl}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={initiatePull}
          disabled={!selectedPeer || pulling}
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {pulling ? 'Pulling...' : 'Start Pull'}
        </Button>
      </div>

      {/* Selected Peer Info */}
      {selectedPeerData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Pulling from: {selectedPeerData.baseUrl}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Pull History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Pull History</span>
          </CardTitle>
          <CardDescription>
            {selectedPeer ? `Pull history for ${selectedPeerData?.baseUrl}` : 'Select a peer to view pull history'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedPeer ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a peer above to view pull history</p>
            </div>
          ) : loadingHistory ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p>Loading pull history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pull history found for this peer</p>
              <p className="text-sm mt-2">Start your first pull to see the history here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Found</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-center">Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {new Date(record.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {record.completedAt 
                          ? new Date(record.completedAt).toLocaleString() 
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{record.incidentsFound}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {record.incidentsCreated}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {record.incidentsUpdated}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.errorMessage ? (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{record.errorMessage}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
