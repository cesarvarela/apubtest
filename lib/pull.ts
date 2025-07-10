import { DrizzleInstance } from "@/db";
import { Incident, Peer, Pull } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

interface ActivityStreamActivity {
    "@context": string | string[];
    id: string;
    type: string;
    actor: string;
    object: any;
}

interface ActivityStreamPage {
    "@context": string;
    id: string;
    type: string;
    next?: string;
    orderedItems: ActivityStreamActivity[];
}

export class PullService {

    constructor(private db: DrizzleInstance) { }

    async pullFromPeer(peerId: string): Promise<void> {
        console.log(`Starting pull from peer ${peerId}`);

        const peerRows = await this.db.select().from(Peer).where(eq(Peer.id, peerId)).limit(1);
        if (peerRows.length === 0) {
            throw new Error(`Peer with id ${peerId} not found`);
        }
        const peer = peerRows[0];
        console.log(`Pulling from ${peer.baseUrl}`);

        const [pullRecord] = await this.db.insert(Pull).values({ peerId, status: "in_progress" }).returning();

        try {
            let totalFound = 0;
            let totalProcessed = 0;
            let totalCreated = 0;
            let totalUpdated = 0;
            let currentPage = 0;
            let nextUrl: string | undefined = peer.outbox;

            while (nextUrl) {
                console.log(`Fetching page ${currentPage}: ${nextUrl}`);
                const response = await fetch(nextUrl, {
                    headers: {
                        'Accept': 'application/activity+json, application/json',
                        'User-Agent': 'ActivityPub-Incident-Puller/1.0',
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${nextUrl}: ${response.status} ${response.statusText}`);
                }
                const page: ActivityStreamPage = await response.json();

                if (page.orderedItems) {
                    totalFound += page.orderedItems.length;
                    for (const activity of page.orderedItems) {
                        totalProcessed++;
                        if (activity.type === "Create" && activity.object) {
                            const incidentObj = activity.object;
                            const incidentUri = incidentObj.id || incidentObj["@id"];
                            if (!incidentUri) {
                                console.warn(`Skipping activity ${activity.id}: no incident URI found`);
                                continue;
                            }
                            try {
                                const existingRows = await this.db
                                    .select()
                                    .from(Incident)
                                    .where(eq(Incident.uri, incidentUri))
                                    .limit(1);
                                if (existingRows.length === 0) {
                                    await this.db.insert(Incident).values({
                                        uri: incidentUri,
                                        data: incidentObj,
                                        sourceNode: peer.baseUrl,
                                    });
                                    totalCreated++;
                                    console.log(`Created new incident: ${incidentUri}`);
                                } else {
                                    const existing = existingRows[0];
                                    const existingDataStr = JSON.stringify(existing.data);
                                    const newDataStr = JSON.stringify(incidentObj);
                                    if (existingDataStr !== newDataStr) {
                                        await this.db
                                            .update(Incident)
                                            .set({ data: incidentObj, sourceNode: peer.baseUrl })
                                            .where(eq(Incident.id, existing.id));
                                        totalUpdated++;
                                        console.log(`Updated incident: ${incidentUri}`);
                                    }
                                }
                            } catch (err) {
                                console.error(`Error processing incident ${incidentUri}:`, err);
                            }
                        }
                    }
                }

                await this.db
                    .update(Pull)
                    .set({
                        contentFound: totalFound.toString(),
                        contentProcessed: totalProcessed.toString(),
                        contentCreated: totalCreated.toString(),
                        contentUpdated: totalUpdated.toString(),
                        lastPage: currentPage.toString(),
                    })
                    .where(eq(Pull.id, pullRecord.id));

                nextUrl = page.next;
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            await this.db
                .update(Pull)
                .set({
                    status: "completed",
                    completedAt: new Date(),
                    contentFound: totalFound.toString(),
                    contentProcessed: totalProcessed.toString(),
                    contentCreated: totalCreated.toString(),
                    contentUpdated: totalUpdated.toString(),
                })
                .where(eq(Pull.id, pullRecord.id));

            console.log(`Pull completed successfully:`);
            console.log(`  - Incidents found: ${totalFound}`);
            console.log(`  - Incidents processed: ${totalProcessed}`);
            console.log(`  - Incidents created: ${totalCreated}`);
            console.log(`  - Incidents updated: ${totalUpdated}`);
        } catch (error) {
            await this.db
                .update(Pull)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : String(error),
                })
                .where(eq(Pull.id, pullRecord.id));
            console.error(`Pull failed:`, error);
            throw error;
        }
    }

    async pullFromAllPeers(): Promise<void> {
        console.log("Starting pull from all peers");
        const peers = await this.db.select().from(Peer);
        if (peers.length === 0) {
            console.log("No peers registered");
            return;
        }
        console.log(`Found ${peers.length} peers`);
        const results = await Promise.allSettled(peers.map((p: any) => this.pullFromPeer(p.id)));
        const successful = results.filter((r: any) => r.status === "fulfilled").length;
        const failed = results.filter((r: any) => r.status === "rejected").length;
        console.log(`Pull summary: ${successful} successful, ${failed} failed`);
        results.forEach((result: any, idx: any) => {
            if (result.status === "rejected") {
                console.error(`Pull from peer ${peers[idx].baseUrl} failed:`, result.reason);
            }
        });
    }

    async getPullHistory(peerId: string, limit: number = 10): Promise<void> {
        const pulls = await this.db
            .select()
            .from(Pull)
            .where(eq(Pull.peerId, peerId))
            .orderBy(desc(Pull.startedAt))
            .limit(limit);
        console.log(`Pull history for peer ${peerId}:`);
        console.table(
            pulls.map((p: any) => ({
                id: p.id.slice(0, 8),
                status: p.status,
                started: p.startedAt.toISOString(),
                completed: p.completedAt?.toISOString(),
                found: p.contentFound,
                created: p.contentCreated,
                updated: p.contentUpdated,
                error: p.errorMessage?.slice(0, 50),
            }))
        );
    }

    async getPullStats(): Promise<void> {
        const stats = await this.db.select().from(Pull).orderBy(desc(Pull.startedAt)).limit(50);
        const byStatus = stats.reduce((acc: any, p: any) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const totalCreated = stats.reduce((sum: any, p: any) => sum + parseInt(p.contentCreated || "0"), 0);
        const totalUpdated = stats.reduce((sum: any, p: any) => sum + parseInt(p.contentUpdated || "0"), 0);
        console.log("Pull Statistics (last 50 pulls):");
        console.log("Status breakdown:", byStatus);
        console.log(`Total incidents created: ${totalCreated}`);
        console.log(`Total incidents updated: ${totalUpdated}`);
    }

    // List all registered peers
    async listPeers(): Promise<void> {
        const peers = await this.db.select().from(Peer);
        console.log("Registered peers:");
        console.table(
            peers.map((p: any) => ({
                id: p.id.slice(0, 8),
                baseUrl: p.baseUrl,
                outbox: p.outbox,
            }))
        );
    }

    // Add a new peer to the database
    async addPeer(baseUrl: string, outboxPath: string = "/outbox"): Promise<void> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        const outboxUrl = `${cleanBaseUrl}${outboxPath}`;
        try {
            const existing = await this.db
                .select()
                .from(Peer)
                .where(eq(Peer.baseUrl, cleanBaseUrl))
                .limit(1);
            if (existing.length > 0) {
                console.log(`Peer ${cleanBaseUrl} already exists with ID: ${existing[0].id}`);
                return;
            }
            const [newPeer] = await this.db.insert(Peer).values({ baseUrl: cleanBaseUrl, outbox: outboxUrl }).returning();
            console.log(`Added new peer: ${cleanBaseUrl}`);
            console.log(`Peer ID: ${newPeer.id}`);
            console.log(`Outbox URL: ${outboxUrl}`);
        } catch (error) {
            console.error(`Failed to add peer ${cleanBaseUrl}:`, error);
            throw error;
        }
    }

    // Remove a peer from the database
    async removePeer(baseUrl: string): Promise<void> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        try {
            const result = await this.db
                .delete(Peer)
                .where(eq(Peer.baseUrl, cleanBaseUrl))
                .returning();
            if (result.length === 0) {
                console.log(`No peer found with base URL: ${cleanBaseUrl}`);
            } else {
                console.log(`Removed peer: ${cleanBaseUrl}`);
            }
        } catch (error) {
            console.error(`Failed to remove peer ${cleanBaseUrl}:`, error);
            throw error;
        }
    }

    // Test connectivity to a peer's outbox
    async testPeer(baseUrl: string): Promise<void> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        try {
            const peerRows = await this.db
                .select()
                .from(Peer)
                .where(eq(Peer.baseUrl, cleanBaseUrl))
                .limit(1);
            if (peerRows.length === 0) {
                console.log(`Peer ${cleanBaseUrl} not found in database`);
                return;
            }
            const peer = peerRows[0];
            console.log(`Testing connectivity to ${peer.outbox}...`);
            const response = await fetch(peer.outbox, {
                headers: {
                    'Accept': 'application/activity+json, application/json',
                    'User-Agent': 'ActivityPub-Incident-Puller/1.0',
                },
            });
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Successfully connected to ${peer.outbox}`);
                console.log(`Response type: ${data.type}`);
                if (data.orderedItems) {
                    console.log(`Found ${data.orderedItems.length} items in current page`);
                }
                if (data.next) {
                    console.log(`Has next page: ${data.next}`);
                }
            } else {
                console.log(`❌ Failed to connect: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error(`❌ Connection failed:`, error);
            throw error;
        }
    }
}
