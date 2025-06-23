import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Pull } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PullService } from '@/lib/pull';

interface Params {
  params: Promise<{ peerId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { peerId } = await params;
  const pulls = await db
    .select()
    .from(Pull)
    .where(eq(Pull.peerId, peerId))
    .orderBy(desc(Pull.startedAt));
  return NextResponse.json(pulls);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { peerId } = await params;
  try {
    await new PullService(db).pullFromPeer(peerId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
