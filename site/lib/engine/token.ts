// Project token helpers shared by /v1/token (JSON, header key) and /api/ca (one-click links).
import { config } from './config';
import { isAddress } from './engine';
import { saveToken, type Token } from './store';

// name and ticker straight from chain metadata (Helius DAS), so the site never shows a typo
export async function tokenMetadata(ca: string): Promise<{ symbol: string | null; name: string | null }> {
  try {
    const r = await fetch(config.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAsset', params: { id: ca } }) });
    const j = (await r.json()) as { result?: { content?: { metadata?: { symbol?: string; name?: string } }; token_info?: { symbol?: string } } };
    const m = j.result?.content?.metadata;
    return { symbol: (m?.symbol || j.result?.token_info?.symbol || '').trim() || null, name: (m?.name || '').trim() || null };
  } catch { return { symbol: null, name: null }; }
}

export const adminKeyOk = (key: string | null) => !!process.env.VERA_ADMIN_KEY && key === process.env.VERA_ADMIN_KEY;

export async function publishToken(raw: string): Promise<{ ok: true; token: Token } | { ok: false; status: number; error: string }> {
  const ca = raw.trim();
  if (!isAddress(ca)) return { ok: false, status: 400, error: 'not a valid Solana address' };
  const meta = await tokenMetadata(ca);
  if (!meta.symbol && !meta.name) return { ok: false, status: 400, error: 'no token metadata found for this address; is it the mint?' };
  const token = { ca, ...meta, set_at: new Date().toISOString() };
  await saveToken(token);
  return { ok: true, token };
}
