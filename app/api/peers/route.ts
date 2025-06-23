import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Peer } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const peers = await db.select().from(Peer);
  return NextResponse.json(peers);
}

export async function POST(req: NextRequest) {
  const { baseUrl, outbox } = await req.json();
  if (!baseUrl || !outbox) {
    return NextResponse.json({ error: 'baseUrl and outbox are required' }, { status: 400 });
  }
  const [peer] = await db.insert(Peer).values({ baseUrl, outbox }).returning();
  return NextResponse.json(peer, { status: 201 });
}
