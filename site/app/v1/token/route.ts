import { revalidatePath } from 'next/cache';
import { config, isAddress, loadToken, saveToken } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: the project token, or { token: null } before launch
export async function GET() {
  return Response.json({ token: await loadToken() });
}

const authorized = (req: Request) => !!process.env.VERA_ADMIN_KEY && req.headers.get('x-admin-key') === process.env.VERA_ADMIN_KEY;

// name and ticker straight from chain metadata (Helius DAS), so the site never shows a typo
async function metadata(ca: string): Promise<{ symbol: string | null; name: string | null }> {
  try {
    const r = await fetch(config.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAsset', params: { id: ca } }) });
    const j = (await r.json()) as { result?: { content?: { metadata?: { symbol?: string; name?: string } }; token_info?: { symbol?: string } } };
    const m = j.result?.content?.metadata;
    return { symbol: (m?.symbol || j.result?.token_info?.symbol || '').trim() || null, name: (m?.name || '').trim() || null };
  } catch { return { symbol: null, name: null }; }
}

// POST { ca } with x-admin-key: reveal the token section. DELETE: hide it again.
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { ca } = (await req.json().catch(() => ({}))) as { ca?: string };
  const addr = String(ca ?? '').trim();
  if (!isAddress(addr)) return Response.json({ error: 'not a valid Solana address' }, { status: 400 });
  const meta = await metadata(addr);
  if (!meta.symbol && !meta.name) return Response.json({ error: 'no token metadata found for this address; is it the mint?' }, { status: 400 });
  const token = { ca: addr, ...meta, set_at: new Date().toISOString() };
  await saveToken(token);
  revalidatePath('/');
  return Response.json({ token });
}

export async function DELETE(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await saveToken(null);
  revalidatePath('/');
  return Response.json({ token: null });
}
