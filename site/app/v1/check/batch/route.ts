import { checkMany, gate } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// up to 10 addresses per call; counts as one request against the anonymous limit
export async function POST(req: Request) {
  const g = gate(req.headers);
  if (!g.ok) return Response.json({ error: g.error }, { status: g.status });
  const body = (await req.json().catch(() => ({}))) as { addresses?: unknown };
  if (!Array.isArray(body.addresses) || !body.addresses.length) return Response.json({ error: 'addresses: non-empty array required (max 10)' }, { status: 400 });
  return Response.json({ results: await checkMany(body.addresses.map(String)) });
}

// CORS preflight; the headers come from next.config.mjs
export function OPTIONS() {
  return new Response(null, { status: 204 });
}
