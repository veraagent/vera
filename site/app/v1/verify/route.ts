import { verify, getSigner, type Attestation } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { attestation?: Attestation; signature?: string };
  if (!body.attestation || !body.signature) return Response.json({ error: 'attestation and signature required' }, { status: 400 });
  return Response.json(verify(body.attestation, body.signature, getSigner().publicKey));
}

// CORS preflight; the headers come from next.config.mjs
export function OPTIONS() {
  return new Response(null, { status: 204 });
}
