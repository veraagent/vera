import { check, gate, publicError } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const g = gate(req.headers);
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });
  try {
    return Response.json(await check((await params).address));
  } catch (e) {
    const { status, error } = publicError(e);
    return Response.json({ error }, { status });
  }
}
