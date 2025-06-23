import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Peer } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = await db.delete(Peer).where(eq(Peer.id, id)).returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { baseUrl, outbox } = await req.json();
  if (!baseUrl || !outbox) {
    return NextResponse.json({ error: 'baseUrl and outbox are required' }, { status: 400 });
  }
  const [updated] = await db.update(Peer).set({ baseUrl, outbox }).where(eq(Peer.id, id)).returning();
  if (!updated) {
    return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
  }
  return NextResponse.json(updated, { status: 200 });
}
