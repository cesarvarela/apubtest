import { db } from '@/db';
import { Peer as PeerTable } from '@/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import PeerManager from './PeerManager';

export default async function PeersPage() {
  const peers = await db.select().from(PeerTable);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Peer Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and configure your ActivityPub peers
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Connected Peers</CardTitle>
          <CardDescription>
            View and manage all connected ActivityPub peers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeerManager initialPeers={peers} />
        </CardContent>
      </Card>
    </div>
  );
}
