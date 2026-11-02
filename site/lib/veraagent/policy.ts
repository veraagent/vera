// GENERATED from ../veraagent/src/policy.ts by `npm run sync-sdk`. Do not edit here.
// Spending policy: pure, dependency-free, runs in Node and the browser.
// Given what a transaction pays out and what Vera says about each recipient, decide: allow, review or block.
import type { Tier } from './client';

export type Action = 'allow' | 'review' | 'block';

export type Policy = {
  /** Recipients below this tier are blocked. Default 'medium'. */
  minTier?: Exclude<Tier, 'unknown'>;
  /** Max SOL one recipient may receive in one transaction, per tier. Default high: no cap, medium: 5, low: 0. Unknown recipients are governed by onUnknown unless you set a cap here. */
  tierLimitsSol?: Partial<Record<Tier, number>>;
  /** Max total SOL leaving the wallet in one transaction. */
  maxSolPerTx?: number;
  /** Max total SOL per UTC day, tracked by the guard's ledger. */
  dailyLimitSol?: number;
  /** Per-mint caps for SPL tokens, in UI units (e.g. { EPjF…Dt1v: 500 } for 500 USDC per transaction). */
  tokenLimits?: Record<string, number>;
  /** Addresses that skip scoring (your own treasury, known vendors). */
  allow?: string[];
  /** Addresses that are always blocked. */
  deny?: string[];
  /** Recipients Vera cannot score (no history). Default 'review'. */
  onUnknown?: Action;
  /** The check failed, its signature did not verify, or it was for another address. Default 'block'. */
  onCheckError?: Exclude<Action, 'allow'>;
  /** Transactions that call programs outside the well-known list. Default 'review'. */
  unknownPrograms?: Action;
  /** Well-known programs that can move value the guard does not decode (swaps, lending). Default 'review'. */
  knownPrograms?: Action;
  /** Instructions that hand over control of the wallet or its tokens (approve, setAuthority, closeAccount to someone else, assign). Default 'block'. */
  riskyInstructions?: Action;
};

export const DEFAULT_POLICY = {
  minTier: 'medium' as const,
  tierLimitsSol: { high: Infinity, medium: 5, low: 0 } as Partial<Record<Tier, number>>,
  allow: [] as string[],
  deny: [] as string[],
  onUnknown: 'review' as Action,
  onCheckError: 'block' as Exclude<Action, 'allow'>,
  unknownPrograms: 'review' as Action,
  knownPrograms: 'review' as Action,
  riskyInstructions: 'block' as Action,
};

/** One movement of value out of the guarded wallet. */
export type Outflow = {
  kind: 'sol' | 'token';
  /** The wallet that ends up owning the funds (token accounts are resolved to their owner). */
  to: string;
  /** The account that is credited: same as `to` for SOL, the token account for SPL. */
  toAccount: string;
  /** SOL for kind 'sol'; UI units for tokens (raw units when decimals are unknown). */
  amount: number;
  mint?: string;
  /** false when token decimals could not be resolved, so `amount` is in raw units. */
  decimalsKnown?: boolean;
  /** The wallet the value leaves (the signer of the transfer). */
  from?: string;
  instruction: string;
};

/** An instruction that changes who controls the wallet or its tokens. */
export type RiskyInstruction = { instruction: string; message: string };

/** What the guard learned about one recipient. */
export type RecipientCheck =
  | { address: string; ok: true; score: number | null; tier: Tier; reasons: { kind: string; text: string }[]; attestationId: string; verified: boolean; expired: boolean }
  | { address: string; ok: false; error: string };

export type Finding = { action: Action; code: string; message: string; address?: string };

export type Decision = {
  action: Action;
  findings: Finding[];
  outflows: Outflow[];
  recipients: RecipientCheck[];
  totalSol: number;
  unknownPrograms: string[];
};

const RANK: Record<Tier, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const ACTIONS = ['allow', 'review', 'block'];
const worst = (a: Action, b: Action): Action => (a === 'block' || b === 'block' ? 'block' : a === 'review' || b === 'review' ? 'review' : 'allow');
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, ''));
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Throws on a policy that would silently weaken checks (typos in tiers or actions, non-numeric limits). */
export function validatePolicy(p: Policy = {}) {
  if (p.minTier !== undefined && !['high', 'medium', 'low'].includes(p.minTier)) throw new Error(`invalid minTier: ${String(p.minTier)}`);
  for (const k of ['onUnknown', 'onCheckError', 'unknownPrograms', 'knownPrograms', 'riskyInstructions'] as const) {
    if (p[k] !== undefined && !ACTIONS.includes(p[k] as string)) throw new Error(`invalid ${k}: ${String(p[k])}`);
  }
  if (p.onCheckError === ('allow' as never)) throw new Error('onCheckError cannot be allow');
  const nums: [string, unknown][] = [['maxSolPerTx', p.maxSolPerTx], ['dailyLimitSol', p.dailyLimitSol],
    ...Object.entries(p.tierLimitsSol ?? {}).map(([k, v]) => [`tierLimitsSol.${k}`, v] as [string, unknown]),
    ...Object.entries(p.tokenLimits ?? {}).map(([k, v]) => [`tokenLimits.${k}`, v] as [string, unknown])];
  for (const [k, v] of nums) if (v !== undefined && (typeof v !== 'number' || Number.isNaN(v) || v < 0)) throw new Error(`invalid ${k}: ${String(v)}`);
  for (const k of Object.keys(p.tierLimitsSol ?? {})) if (!(k in RANK)) throw new Error(`invalid tier in tierLimitsSol: ${k}`);
}

export function evaluatePolicy(input: {
  outflows: Outflow[];
  recipients: RecipientCheck[];
  unknownPrograms?: string[];
  /** names of well-known programs that may move value the guard does not decode */
  valuePrograms?: string[];
  risky?: RiskyInstruction[];
  spentTodaySol?: number;
  policy?: Policy;
}): Decision {
  validatePolicy(input.policy);
  const p = { ...DEFAULT_POLICY, ...input.policy, tierLimitsSol: { ...DEFAULT_POLICY.tierLimitsSol, ...input.policy?.tierLimitsSol } };
  const allow = new Set(p.allow), deny = new Set(p.deny);
  const findings: Finding[] = [];
  const add = (action: Action, code: string, message: string, address?: string) => findings.push({ action, code, message, ...(address ? { address } : {}) });

  // malformed amounts never pass and never count toward limits
  const good = (o: Outflow) => typeof o.amount === 'number' && Number.isFinite(o.amount) && o.amount >= 0;
  for (const o of input.outflows) if (!good(o)) add('block', 'bad_amount', `Invalid amount ${String(o.amount)} to ${short(String(o.to))}`, o.to);
  const outflows = input.outflows.filter(good);

  const totalSol = outflows.filter((o) => o.kind === 'sol').reduce((s, o) => s + o.amount, 0);
  const solTo = new Map<string, number>();
  for (const o of outflows) if (o.kind === 'sol') solTo.set(o.to, (solTo.get(o.to) || 0) + o.amount);
  const byAddr = new Map(input.recipients.map((r) => [r.address, r]));

  for (const to of new Set(outflows.map((o) => o.to))) {
    const s = short(to);
    if (deny.has(to)) { add('block', 'denylisted', `${s} is on your deny list`, to); continue; }
    if (allow.has(to)) continue;
    const r = byAddr.get(to);
    if (!r || !r.ok) { add(p.onCheckError, 'check_failed', `Could not check ${s}${r && !r.ok ? `: ${r.error}` : ''}`, to); continue; }
    if (!(r.tier in RANK)) { add(p.onCheckError, 'bad_tier', `Vera returned an unexpected tier for ${s}`, to); continue; }
    if (!r.verified) { add(p.onCheckError, 'bad_signature', `Vera's signature for ${s} did not verify`, to); continue; }
    if (r.expired) add('review', 'stale_check', `Vera's result for ${s} has expired`, to);
    if (r.tier === 'unknown') {
      add(p.onUnknown, 'unknown_recipient', `${s} has no history Vera can score`, to);
    } else if (RANK[r.tier] < RANK[p.minTier]) {
      add('block', 'tier_below_minimum', `${s} is ${r.tier} trust (${r.score}/100), below your minimum of ${p.minTier}: ${r.reasons[0]?.text ?? ''}`.trim(), to);
    }
    const cap = p.tierLimitsSol[r.tier] ?? Infinity;
    const sent = solTo.get(to) || 0;
    if (sent > cap) add(cap === 0 ? 'block' : 'review', 'tier_limit', `${fmt(sent)} SOL to ${s} exceeds the ${fmt(cap)} SOL limit for ${r.tier} trust`, to);
  }

  for (const o of outflows) {
    if (o.kind !== 'token') continue;
    if (o.decimalsKnown === false) { add('review', 'unknown_decimals', `Could not read token decimals for ${short(o.toAccount)}; amount not compared to limits`, o.to); continue; }
    if (o.mint && p.tokenLimits && o.mint in p.tokenLimits && o.amount > p.tokenLimits[o.mint])
      add('review', 'token_limit', `${fmt(o.amount)} of ${o.mint.slice(0, 4)}… exceeds your ${fmt(p.tokenLimits[o.mint])} per-transaction cap`, o.to);
  }
  if (p.maxSolPerTx !== undefined && totalSol > p.maxSolPerTx) add('block', 'tx_limit', `${fmt(totalSol)} SOL in one transaction exceeds your ${fmt(p.maxSolPerTx)} SOL cap`);
  if (p.dailyLimitSol !== undefined && (input.spentTodaySol ?? 0) + totalSol > p.dailyLimitSol)
    add('block', 'daily_limit', `This would bring today's spend to ${fmt((input.spentTodaySol ?? 0) + totalSol)} SOL, over your ${fmt(p.dailyLimitSol)} SOL daily limit`);
  for (const r of input.risky ?? []) if (p.riskyInstructions !== 'allow') add(p.riskyInstructions, 'risky_instruction', r.message);
  if (input.unknownPrograms?.length && p.unknownPrograms !== 'allow')
    add(p.unknownPrograms, 'unknown_program', `Calls ${input.unknownPrograms.length} program${input.unknownPrograms.length > 1 ? 's' : ''} outside the well-known list: ${input.unknownPrograms.map((x) => x.slice(0, 4) + '…').join(', ')}`);
  if (input.valuePrograms?.length && p.knownPrograms !== 'allow')
    add(p.knownPrograms, 'opaque_value', `Value may move inside ${input.valuePrograms.join(', ')}, which the guard does not decode`);

  const action = findings.reduce<Action>((a, f) => worst(a, f.action), 'allow');
  return { action, findings, outflows, recipients: input.recipients, totalSol, unknownPrograms: input.unknownPrograms ?? [] };
}
