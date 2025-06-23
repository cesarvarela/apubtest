import { db } from '@/db';
import { Peer as PeerTable } from '@/db/schema';

import PeerManager from './PeerManager';

export default async function PeersPage() {
  const peers = await db.select().from(PeerTable);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Peer Management</h1>
      <PeerManager initialPeers={peers} />
    </div>
  );
}
