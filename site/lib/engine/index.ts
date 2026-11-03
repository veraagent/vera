// Public surface of the Vera engine, shared by the Next.js routes (Vercel) and the standalone server, CLI and MCP.
export { check, checkMany, getAttestation, isAddress, type CheckResult } from './engine';
export { verify, getSigner, canonical, type Attestation, type Signed } from './attest';
export { config, aiEnabled } from './config';
export { loadStats, storeEnabled, loadToken, saveToken, type Stats, type Token } from './store';
export { publishToken, adminKeyOk, tokenMetadata } from './token';

import { config } from './config';

// Access control: an x-api-key from VERA_API_KEYS skips the limit; anonymous callers get a per-IP budget per minute.
// In serverless this budget is per instance, so it is a soft limit; put a gateway in front for hard quotas.
const hits = new Map<string, number[]>();
export function gate(headers: { get(name: string): string | null }): { ok: true } | { ok: false; status: 401 | 429; error: string } {
  const key = headers.get('x-api-key');
  if (key && config.apiKeys.includes(key)) return { ok: true };
  if (key) return { ok: false, status: 401, error: 'invalid API key' };
  const ip = headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'local';
  const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= config.anonPerMinute) return { ok: false, status: 429, error: 'rate limited: send an x-api-key or retry in a minute' };
  hits.set(ip, [...recent, now]);
  return { ok: true };
}

export function publicError(e: unknown): { status: number; error: string } {
  const err = e as Error & { status?: number };
  if (err.status === 400) return { status: 400, error: err.message };
  console.error('[vera] check failed:', err.message);
  return { status: 502, error: 'check failed upstream, try again' };
}
