// check(address): features -> deterministic score -> optional AI refinement -> signed attestation (-> optional anchor).
import fs from 'node:fs';
import path from 'node:path';
import bs58 from 'bs58';
import { config } from './config';
import { collect, type Features } from './features';
import { baseScore } from './score';
import { refine } from './ai';
import { sign, anchor, canonical, hashHex, type Signed } from './attest';
import { saveResult, loadResult } from './store';

export const isAddress = (s: string) => {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false;
  try { return bs58.decode(s).length === 32; } catch { return false; }
};
export type CheckResult = Signed & { summary: string | null; features: Features };

const cache = new Map<string, { at: number; result: CheckResult }>();
const store = new Map<string, Signed>();

// load past attestations so GET /v1/attestations/:id survives restarts
try {
  for (const line of fs.readFileSync(config.storePath, 'utf8').split('\n')) if (line.trim()) { const s = JSON.parse(line) as Signed; store.set(s.id, s); }
} catch { /* no store yet */ }

// local file store first (self-hosted server), then the shared store (Vercel KV / Upstash)
export const getAttestation = async (id: string) => store.get(id) ?? (await loadResult(id));

export async function check(address: string, { fresh = false } = {}): Promise<CheckResult> {
  if (!isAddress(address)) throw Object.assign(new Error('not a valid Solana address'), { status: 400 });
  const hit = cache.get(address);
  if (!fresh && hit && Date.now() - hit.at < config.cacheMinutes * 60_000) return hit.result;

  const features = await collect(address);
  const base = baseScore(features);
  let final: typeof base & { summary?: string; model?: string } = base;
  try {
    const ai = await refine(features, base);
    if (ai) final = ai;
  } catch (e) {
    console.error('[vera] AI refinement failed, using deterministic score:', (e as Error).message);
  }

  const now = new Date();
  const signed = sign({
    subject: address,
    score: final.score,
    tier: final.tier,
    reasons: final.reasons.map(({ kind, text }) => ({ kind, text })),
    features_sha256: hashHex(canonical(features)),
    method: final.model ? `vera-v1+${final.model}` : 'vera-v1',
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + config.ttlHours * 3600_000).toISOString(),
  });
  try { signed.anchor = await anchor(signed.id); } catch (e) { console.error('[vera] anchor failed:', (e as Error).message); signed.anchor = null; }

  store.set(signed.id, signed);
  try {
    fs.mkdirSync(path.dirname(config.storePath), { recursive: true });
    fs.appendFileSync(config.storePath, JSON.stringify(signed) + '\n');
  } catch (e) { console.error('[vera] store write failed:', (e as Error).message); }

  const result: CheckResult = { ...signed, summary: final.summary ?? null, features };
  await saveResult({ ...signed, summary: result.summary });
  cache.set(address, { at: Date.now(), result });
  return result;
}

// several counterparties at once (e.g. every recipient in a multi-payment plan); failures are reported per address
export async function checkMany(addresses: string[]) {
  const uniq = [...new Set(addresses.map((a) => a.trim()))].slice(0, 10);
  const out = await Promise.allSettled(uniq.map((a) => check(a)));
  return uniq.map((address, i) => {
    const r = out[i];
    return r.status === 'fulfilled' ? { address, ok: true as const, result: r.value } : { address, ok: false as const, error: (r.reason as Error).message };
  });
}
