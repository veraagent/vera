// Vera API client: score an address and verify the signed result locally against Vera's published key.
//
//   import { Vera } from 'veralayer';
//   const vera = new Vera();   // hosted API, results must be signed with VERA_ISSUER
//   const check = await vera.check(counterparty);
//   if (!(await vera.verify(check)).valid) throw new Error('bad attestation');
//   if (check.attestation.tier === 'low') throw new Error(check.attestation.reasons[0].text);
import { ed25519 } from '@noble/curves/ed25519.js';
import bs58 from 'bs58';

export type Tier = 'high' | 'medium' | 'low' | 'unknown';
export type Attestation = {
  v: 1;
  issuer: string;
  subject: string;
  score: number | null;
  tier: Tier;
  reasons: { kind: 'ok' | 'warn' | 'bad' | 'info'; text: string }[];
  features_sha256: string;
  method: string;
  issued_at: string;
  expires_at: string;
};
export type CheckResult = { id: string; attestation: Attestation; signature: string; summary: string | null; anchor?: { cluster: string; tx: string } | null; features?: Record<string, unknown> };
export type VerifyResult = { valid: boolean; expired: boolean; reason?: string };

export class VeraError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

/** Vera's production signing key. Results signed by anything else are rejected unless you pass your own `issuer`. */
export const VERA_ISSUER = '4VyCQLEb8eVmPYXDUwYkEpCMhXFBRshUiKHHuKTfPDFQ';
export const DEFAULT_API_URL = 'https://veraagent.io';
const TIERS = ['high', 'medium', 'low', 'unknown'];

// key-sorted JSON: must match the engine byte for byte
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}

/** Verify an attestation offline. Pass the trusted Vera issuer key (from /.well-known/vera.json) to pin it. */
export function verifyAttestation(attestation: Attestation, signature: string, trustedIssuer?: string): VerifyResult {
  const exp = Date.parse(attestation?.expires_at);
  const expired = !(exp > Date.now()); // an unparseable date counts as expired
  if (!attestation || typeof attestation.issuer !== 'string') return { valid: false, expired, reason: 'malformed attestation' };
  if (trustedIssuer && attestation.issuer !== trustedIssuer) return { valid: false, expired, reason: 'issuer is not the trusted Vera key' };
  if (!TIERS.includes(attestation.tier)) return { valid: false, expired, reason: `unexpected tier ${String(attestation.tier)}` };
  try {
    const ok = ed25519.verify(bs58.decode(signature), new TextEncoder().encode(canonical(attestation)), bs58.decode(attestation.issuer));
    return ok ? { valid: true, expired } : { valid: false, expired, reason: 'signature does not match' };
  } catch {
    return { valid: false, expired, reason: 'malformed signature or issuer' };
  }
}

export class Vera {
  private apiUrl: string;
  private apiKey?: string;
  private issuer?: string;
  private timeoutMs: number;

  /**
   * @param opts.issuer  the key results must be signed with. Defaults to Vera's production key (VERA_ISSUER).
   *                     Pass your own for a self-hosted Vera, or 'fetch' to trust /.well-known/vera.json on apiUrl.
   */
  constructor(opts: { apiUrl?: string; apiKey?: string; issuer?: string; timeoutMs?: number } = {}) {
    this.apiUrl = (opts.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.issuer = opts.issuer === 'fetch' ? undefined : (opts.issuer ?? VERA_ISSUER);
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    let r: Response;
    try {
      r = await fetch(this.apiUrl + path, { ...init, signal: AbortSignal.timeout(this.timeoutMs), headers: { 'content-type': 'application/json', ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}), ...init?.headers } });
    } catch (e) {
      throw new VeraError(`Vera API unreachable: ${(e as Error).message}`);
    }
    const j = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new VeraError(j.error || `Vera API error ${r.status}`, r.status);
    return j;
  }

  /** Score a counterparty. Returns score, tier, reasons and a signed attestation. Throws if the result is for a different address. */
  async check(address: string, opts: { fresh?: boolean } = {}): Promise<CheckResult> {
    const r = await this.req<CheckResult>('/v1/check', { method: 'POST', body: JSON.stringify({ address, fresh: opts.fresh }) });
    if (r?.attestation?.subject !== address) throw new VeraError('Vera returned a result for a different address');
    return r;
  }

  /** The key results must be signed with: pinned (default) or fetched once from /.well-known/vera.json. */
  async getIssuer(): Promise<string> {
    this.issuer ??= (await this.req<{ issuer: string }>('/.well-known/vera.json')).issuer;
    return this.issuer;
  }

  /** Verify a check result locally against the trusted issuer key. */
  async verify(result: Pick<CheckResult, 'attestation' | 'signature'>): Promise<VerifyResult> {
    return verifyAttestation(result.attestation, result.signature, await this.getIssuer());
  }

  /** Convenience gate: throws unless the result verifies, has not expired and meets the minimum tier. */
  async require(address: string, minTier: Exclude<Tier, 'unknown'> = 'medium'): Promise<CheckResult> {
    const rank = { unknown: 0, low: 1, medium: 2, high: 3 } as const;
    if (!(minTier in rank)) throw new VeraError(`invalid minTier: ${minTier}`);
    const r = await this.check(address);
    const v = await this.verify(r);
    if (!v.valid) throw new VeraError(`attestation invalid: ${v.reason}`);
    if (v.expired) throw new VeraError('attestation expired');
    if (rank[r.attestation.tier] < rank[minTier]) throw new VeraError(`counterparty tier ${r.attestation.tier} is below ${minTier}: ${r.attestation.reasons[0]?.text ?? ''}`);
    return r;
  }
}
