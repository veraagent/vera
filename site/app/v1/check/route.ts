import { check, gate, publicError } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = gate(req.headers);
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });
  const body = (await req.json().catch(() => ({}))) as { address?: string; fresh?: boolean };
  try {
    return Response.json(await check(String(body.address ?? '').trim(), { fresh: !!body.fresh }));
  } catch (e) {
    const { status, error } = publicError(e);
    return Response.json({ error }, { status });
  }
}

// CORS preflight; the headers come from next.config.mjs
export function OPTIONS() {
  return new Response(null, { status: 204 });
}
