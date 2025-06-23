"use client";

import React, { useState } from 'react';

type Peer = { id: string; baseUrl: string; outbox: string };

interface PeerManagerProps { initialPeers: Peer[]; }

export default function PeerManager({ initialPeers }: PeerManagerProps) {
  const [peers, setPeers] = useState<Peer[]>(initialPeers);
  const [baseUrl, setBaseUrl] = useState('');
  const [outbox, setOutbox] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editOutbox, setEditOutbox] = useState('');

  const addPeer = async () => {
    if (!baseUrl || !outbox) {
      alert('Both Base URL and Outbox are required');
      return;
    }
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
    } else {
      alert('Failed to add peer');
    }
  };

  const deletePeer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this peer?')) return;
    const res = await fetch(`/api/peers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPeers((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert('Failed to delete peer');
    }
  };

  const startEditing = (peer: Peer) => {
    setEditingId(peer.id);
    setEditBaseUrl(peer.baseUrl);
    setEditOutbox(peer.outbox);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async () => {
    if (!editBaseUrl || !editOutbox) {
      alert('Both Base URL and Outbox are required');
      return;
    }
    const res = await fetch(`/api/peers/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: editBaseUrl, outbox: editOutbox }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPeers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingId(null);
    } else {
      alert('Failed to update peer');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Add Peer</h2>
        <div className="flex space-x-2">
          <input
            className="border p-1 flex-1"
            placeholder="Base URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <input
            className="border p-1 flex-1"
            placeholder="Outbox"
            value={outbox}
            onChange={(e) => setOutbox(e.target.value)}
          />
          <button className="px-4 py-1 bg-blue-500 text-white rounded" onClick={addPeer}>
            Add
          </button>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Existing Peers</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2">Base URL</th>
            <th className="border p-2">Outbox</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((peer) => (
            <tr key={peer.id}>
              {editingId !== peer.id ? (
                <>
                  <td className="border p-2">{peer.baseUrl}</td>
                  <td className="border p-2">{peer.outbox}</td>
                  <td className="border p-2 space-x-2">
                    <button className="text-blue-500" onClick={() => startEditing(peer)}>
                      Edit
                    </button>
                    <button className="text-red-500" onClick={() => deletePeer(peer.id)}>
                      Delete
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="border p-2">
                    <input
                      className="border p-1 w-full"
                      value={editBaseUrl}
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="border p-1 w-full"
                      value={editOutbox}
                      onChange={(e) => setEditOutbox(e.target.value)}
                    />
                  </td>
                  <td className="border p-2 space-x-2">
                    <button className="text-green-500" onClick={saveEditing}>
                      Save
                    </button>
                    <button className="text-gray-500" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
