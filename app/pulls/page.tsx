import { db } from '@/db';
import { Peer as PeerTable } from '@/db/schema';
import PullManager from './PullManager';

export default async function PullsPage() {
  const peers = await db.select().from(PeerTable);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pull Management</h1>
       <PullManager initialPeers={peers} />
    </div>
  );
}
