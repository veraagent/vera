import { getAttestation } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAttestation((await params).id);
  return a ? Response.json(a) : Response.json({ error: 'not found: results are kept for 30 days, and every result verifies on its own, so keep the signed copy' }, { status: 404 });
}
