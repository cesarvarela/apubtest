"use client";

import React, { useState } from 'react';
import { Peer as PeerType, Pull as PullType } from '@/db/schema';

interface Peer { id: string; baseUrl: string }
interface PullRecord { id: string; status: string; startedAt: string; completedAt: string | null; incidentsFound: string; incidentsProcessed: string; incidentsCreated: string; incidentsUpdated: string; errorMessage?: string }

interface PullManagerProps { initialPeers: Peer[] }

export default function PullManager({ initialPeers }: PullManagerProps) {
  const [peers] = useState<Peer[]>(initialPeers);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [history, setHistory] = useState<PullRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pulling, setPulling] = useState(false);

  const fetchHistory = async (peerId: string) => {
    setLoadingHistory(true);
    const res = await fetch(`/api/pulls/${peerId}`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data);
    } else {
      alert('Failed to load pull history');
    }
    setLoadingHistory(false);
  };

  const initiatePull = async () => {
    if (!selectedPeer) return;
    setPulling(true);
    const res = await fetch(`/api/pulls/${selectedPeer}`, { method: 'POST' });
    if (res.ok) {
      alert('Pull started');
      fetchHistory(selectedPeer);
    } else {
      const err = await res.json();
      alert(`Pull failed: ${err.error}`);
    }
    setPulling(false);
  };

  return (
    <div>
      <div className="mb-4">
        <label className="mr-2">Select Peer:</label>
        <select
          className="border p-1"
          value={selectedPeer || ''}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedPeer(id);
            fetchHistory(id);
          }}
        >
          <option value="">-- Choose Peer --</option>
          {peers.map((p) => (
            <option key={p.id} value={p.id}>{p.baseUrl}</option>
          ))}
        </select>
        <button
          className="ml-2 px-4 py-1 bg-green-500 text-white rounded"
          onClick={initiatePull}
          disabled={!selectedPeer || pulling}
        >
          {pulling ? 'Pulling…' : 'Start Pull'}
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-2">Pull History</h2>
      {loadingHistory ? (
        <p>Loading history…</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">Started</th>
              <th className="border p-2">Completed</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Found</th>
              <th className="border p-2">Created</th>
              <th className="border p-2">Updated</th>
              <th className="border p-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="border p-2">{new Date(h.startedAt).toLocaleString()}</td>
                <td className="border p-2">{h.completedAt ? new Date(h.completedAt).toLocaleString() : '-'}</td>
                <td className="border p-2">{h.status}</td>
                <td className="border p-2">{h.incidentsFound}</td>
                <td className="border p-2">{h.incidentsCreated}</td>
                <td className="border p-2">{h.incidentsUpdated}</td>
                <td className="border p-2 text-red-500">{h.errorMessage || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
