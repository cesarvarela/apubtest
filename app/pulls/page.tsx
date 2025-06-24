import { db } from '@/db';
import { Peer as PeerTable } from '@/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import PullManager from './PullManager';

export default async function PullsPage() {
  const peers = await db.select().from(PeerTable);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pull Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and monitor ActivityPub data pulls from connected peers
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Pulls</CardTitle>
          <CardDescription>
            Initiate and monitor data synchronization from ActivityPub peers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PullManager initialPeers={peers} />
        </CardContent>
      </Card>
    </div>
  );
}
