// Durable storage for signed results and live counters, via Upstash Redis REST (what Vercel KV / Upstash integrations provide).
// Env: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Without them, everything falls back to process memory and stats are reported as unavailable.
import type { Signed } from './attest';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const storeEnabled = () => !!(URL_ && TOKEN);

const TTL_DAYS = 30;
const mem = new Map<string, Signed & { summary?: string | null }>();

async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const r = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmds), cache: 'no-store' });
  if (!r.ok) throw new Error(`store: HTTP ${r.status}`);
  const out = (await r.json()) as { result?: unknown; error?: string }[];
  return out.map((x) => { if (x.error) throw new Error(`store: ${x.error}`); return x.result; });
}

const today = () => new Date().toISOString().slice(0, 10);

/** Save a signed result and bump the counters. Never throws: storage problems must not fail a check. */
export async function saveResult(s: Signed & { summary?: string | null }) {
  mem.set(s.id, s);
  if (!storeEnabled()) return;
  const tier = s.attestation.tier;
  try {
    await pipeline([
      ['SET', `att:${s.id}`, JSON.stringify(s), 'EX', TTL_DAYS * 86400],
      ['INCR', 'stats:checks'],
      ['INCR', `stats:checks:${today()}`],
      ['EXPIRE', `stats:checks:${today()}`, 3 * 86400],
      ['INCR', `stats:tier:${tier}`],
      ['SET', 'stats:last', s.attestation.issued_at],
    ]);
  } catch (e) {
    console.error('[vera] store write failed:', (e as Error).message);
  }
}

export async function loadResult(id: string): Promise<(Signed & { summary?: string | null }) | null> {
  if (!/^[0-9a-f]{64}$/.test(id)) return null;
  const hit = mem.get(id);
  if (hit || !storeEnabled()) return hit ?? null;
  try {
    const [raw] = await pipeline([['GET', `att:${id}`]]);
    return raw ? JSON.parse(String(raw)) : null;
  } catch { return null; }
}

export type Stats = { checks: number; today: number; low: number; high: number; medium: number; unknown: number; last: string | null };

export async function loadStats(): Promise<Stats | null> {
  if (!storeEnabled()) return null;
  try {
    const [checks, t, low, medium, high, unknown, last] = await pipeline([
      ['GET', 'stats:checks'], ['GET', `stats:checks:${today()}`], ['GET', 'stats:tier:low'], ['GET', 'stats:tier:medium'],
      ['GET', 'stats:tier:high'], ['GET', 'stats:tier:unknown'], ['GET', 'stats:last'],
    ]);
    const n = (x: unknown) => Number(x ?? 0) || 0;
    return { checks: n(checks), today: n(t), low: n(low), medium: n(medium), high: n(high), unknown: n(unknown), last: (last as string) ?? null };
  } catch { return null; }
}
