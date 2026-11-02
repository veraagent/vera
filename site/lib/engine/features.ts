// Collects on-chain facts about an address (Helius RPC + Enhanced Transactions API) and turns them into features.
// Everything here is deterministic: the same chain state gives the same features.
import { config } from './config';
import flaggedSeed from './flagged.json';
import { KNOWN_PROGRAMS } from './programs';

const SIG_PAGES = 3; // up to 3 x 1000 signatures to find the wallet's age
const SAMPLE = 100; // most recent transactions parsed in detail
const DAY = 86400;

export type Features = {
  address: string;
  exists: boolean;
  kind: 'wallet' | 'program' | 'token_account' | 'other';
  owner_program: string | null;
  balance_sol: number;
  tx_count: number; // signatures seen, capped at SIG_PAGES * 1000
  tx_count_capped: boolean;
  age_days: number | null; // days since the oldest signature seen
  age_is_lower_bound: boolean; // true when history was cut at the signature window: the wallet is at least this old, likely much older
  last_active_days: number | null;
  failed_ratio: number;
  sample_size: number;
  counterparties: number;
  repeat_counterparties: number; // seen in 2+ sampled transactions
  top_counterparty_share: number; // share of sampled transactions involving the most frequent counterparty
  sol_in_sample: number;
  sol_out_sample: number;
  programs_known: Record<string, number>; // program name -> calls in sample
  unknown_programs: number; // distinct unverified programs in sample
  unknown_program_calls: number;
  program_calls: number;
  activity_types: Record<string, number>; // Helius tx types (SWAP, TRANSFER, ...)
  token_creations: number; // coins created by this address in the sample
  flagged_self: { listed: boolean; reason?: string };
  flagged_counterparties: { address: string; reason: string }[];
  drain_pattern: boolean; // young wallet that sent out most of what it received
  // who sent this wallet its first SOL (only traced when the full history fits in the signature window)
  funding: { traced: boolean; funder: string | null; flagged: boolean; flag_reason?: string; funder_age_days: number | null; funder_tx_count: number | null; funder_capped: boolean } | null;
};

type Sig = { signature: string; blockTime: number | null; err: unknown };
type EnhancedTx = {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  feePayer: string;
  transactionError: unknown;
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
  tokenTransfers?: { fromUserAccount: string; toUserAccount: string; mint: string }[];
  instructions?: { programId: string; innerInstructions?: { programId: string }[] }[];
};

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(config.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((s) => setTimeout(s, 400 * 2 ** attempt)); continue; }
    const j = (await r.json()) as { result?: T; error?: { message: string } };
    if (j.error) throw new Error(`${method}: ${j.error.message}`);
    return j.result as T;
  }
}

// parse transactions in parallel chunks: one 100-tx call takes ~10s, four 25-tx calls ~3s
async function enhanced(sigs: string[]): Promise<EnhancedTx[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < sigs.length; i += 25) chunks.push(sigs.slice(i, i + 25));
  return (await Promise.all(chunks.map(enhancedChunk))).flat();
}
async function enhancedChunk(sigs: string[]): Promise<EnhancedTx[]> {
  if (!sigs.length || !config.heliusKey) return [];
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${config.enhancedUrl}/transactions?api-key=${config.heliusKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transactions: sigs }) });
    if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((s) => setTimeout(s, 500 * 2 ** attempt)); continue; }
    if (!r.ok) throw new Error(`enhanced transactions: HTTP ${r.status}`);
    return (await r.json()) as EnhancedTx[];
  }
}

// Flagged addresses: the bundled seed list plus VERA_FLAGGED_URL (a JSON array of {address, reason}) when set.
let flaggedCache: { at: number; map: Record<string, string> } | null = null;
export async function flaggedList(): Promise<Record<string, string>> {
  if (flaggedCache && Date.now() - flaggedCache.at < 10 * 60_000) return flaggedCache.map;
  const map: Record<string, string> = Object.fromEntries((flaggedSeed as { address: string; reason: string }[]).map((f) => [f.address, f.reason]));
  if (process.env.VERA_FLAGGED_URL) {
    try {
      const extra = (await (await fetch(process.env.VERA_FLAGGED_URL)).json()) as { address: string; reason: string }[];
      for (const f of extra) if (f?.address) map[f.address] = String(f.reason || 'flagged');
    } catch (e) { console.error('[vera] flagged feed failed:', (e as Error).message); }
  }
  flaggedCache = { at: Date.now(), map };
  return map;
}

const SYSTEM_IDS = new Set(['11111111111111111111111111111111', 'ComputeBudget111111111111111111111111111111']);

export async function collect(address: string): Promise<Features> {
  const now = Date.now() / 1000;
  const [acct, bal] = await Promise.all([
    rpc<{ value: { owner: string; executable: boolean; data: unknown } | null }>('getAccountInfo', [address, { encoding: 'base64', commitment: 'confirmed' }]),
    rpc<{ value: number }>('getBalance', [address, { commitment: 'confirmed' }]),
  ]);

  // signatures, newest first; page back to estimate age
  const owner = acct.value?.owner ?? null;
  if (acct.value?.executable) {
    return {
      address, exists: true, kind: 'program', owner_program: owner, balance_sol: +(bal.value / 1e9).toFixed(4),
      tx_count: 0, tx_count_capped: false, age_days: null, age_is_lower_bound: false, last_active_days: null, failed_ratio: 0, sample_size: 0,
      counterparties: 0, repeat_counterparties: 0, top_counterparty_share: 0, sol_in_sample: 0, sol_out_sample: 0,
      programs_known: {}, unknown_programs: 0, unknown_program_calls: 0, program_calls: 0, activity_types: {}, token_creations: 0,
      flagged_self: { listed: false }, flagged_counterparties: [], drain_pattern: false, funding: null,
    };
  }

  // the newest page feeds the detailed sample right away, older pages (for age) load in parallel with it
  const sigs: Sig[] = await rpc<Sig[]>('getSignaturesForAddress', [address, { limit: 1000 }]);
  const txsP = enhanced(sigs.slice(0, SAMPLE).map((s) => s.signature));
  for (let p = 1, page = sigs; p < SIG_PAGES && page.length === 1000; p++) {
    page = await rpc<Sig[]>('getSignaturesForAddress', [address, { limit: 1000, before: page[page.length - 1].signature }]);
    sigs.push(...page);
  }
  const capped = sigs.length >= SIG_PAGES * 1000;
  const times = sigs.map((s) => s.blockTime).filter((t): t is number => !!t);
  const kind: Features['kind'] = !acct.value ? 'wallet' : acct.value.executable ? 'program' : owner === '11111111111111111111111111111111' ? 'wallet'
    : owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || owner === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'token_account' : 'other';

  const txs = await txsP;
  const flagged = await flaggedList();

  const cpCount = new Map<string, number>();
  const known: Record<string, number> = {};
  const unknown = new Set<string>();
  let unknownCalls = 0, calls = 0, solIn = 0, solOut = 0, creations = 0;
  const types: Record<string, number> = {};
  for (const tx of txs) {
    types[tx.type] = (types[tx.type] || 0) + 1;
    if (tx.type === 'CREATE' || tx.type === 'TOKEN_MINT') if (tx.feePayer === address) creations++;
    const cps = new Set<string>();
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === address && t.fromUserAccount !== address) { solIn += t.amount / 1e9; cps.add(t.fromUserAccount); }
      if (t.fromUserAccount === address && t.toUserAccount !== address) { solOut += t.amount / 1e9; cps.add(t.toUserAccount); }
    }
    for (const t of tx.tokenTransfers ?? []) {
      if (t.toUserAccount === address && t.fromUserAccount) cps.add(t.fromUserAccount);
      if (t.fromUserAccount === address && t.toUserAccount) cps.add(t.toUserAccount);
    }
    if (tx.feePayer !== address) cps.add(tx.feePayer);
    for (const c of cps) if (c && c !== address) cpCount.set(c, (cpCount.get(c) || 0) + 1);
    for (const ix of tx.instructions ?? []) {
      for (const pid of [ix.programId, ...(ix.innerInstructions ?? []).map((i) => i.programId)]) {
        if (!pid || SYSTEM_IDS.has(pid)) continue;
        calls++;
        const name = KNOWN_PROGRAMS[pid];
        if (name) known[name] = (known[name] || 0) + 1;
        else { unknown.add(pid); unknownCalls++; }
      }
    }
  }
  const top = Math.max(0, ...cpCount.values());
  const ageDays = times.length ? (now - Math.min(...times)) / DAY : null;
  const flaggedCps = [...cpCount.keys()].filter((c) => flagged[c]).map((c) => ({ address: c, reason: flagged[c] }));

  // funding source: the earliest inbound SOL transfer, when the whole history is within the window
  let funding: Features['funding'] = null;
  if (!capped && sigs.length > 0) {
    const oldest = sigs.slice(-25).reverse();
    const early = (await enhanced(oldest.map((s) => s.signature))).sort((a, b) => a.timestamp - b.timestamp);
    let funder: string | null = null;
    for (const tx of early) {
      const t = (tx.nativeTransfers ?? []).find((n) => n.toUserAccount === address && n.fromUserAccount && n.fromUserAccount !== address && n.amount > 0);
      if (t) { funder = t.fromUserAccount; break; }
    }
    if (funder) {
      const fs_ = await rpc<Sig[]>('getSignaturesForAddress', [funder, { limit: 1000 }]);
      const ft = fs_.map((x) => x.blockTime).filter((t): t is number => !!t);
      funding = {
        traced: true, funder, flagged: !!flagged[funder], ...(flagged[funder] ? { flag_reason: flagged[funder] } : {}),
        // a funder with 1000+ signatures is a high-volume source (exchange, router, bot); its age is unknown, not young
        funder_age_days: fs_.length >= 1000 ? null : ft.length ? Math.floor((now - Math.min(...ft)) / DAY) : null,
        funder_tx_count: fs_.length, funder_capped: fs_.length >= 1000,
      };
    } else funding = { traced: true, funder: null, flagged: false, funder_age_days: null, funder_tx_count: null, funder_capped: false };
  }

  return {
    address,
    exists: !!acct.value || sigs.length > 0,
    kind,
    owner_program: owner,
    balance_sol: +(bal.value / 1e9).toFixed(4),
    tx_count: sigs.length,
    tx_count_capped: capped,
    age_days: ageDays === null ? null : Math.floor(ageDays),
    age_is_lower_bound: capped,
    last_active_days: times.length ? Math.floor((now - Math.max(...times)) / DAY) : null,
    failed_ratio: sigs.length ? +(sigs.filter((s) => s.err).length / sigs.length).toFixed(3) : 0,
    sample_size: txs.length,
    counterparties: cpCount.size,
    repeat_counterparties: [...cpCount.values()].filter((n) => n >= 2).length,
    top_counterparty_share: txs.length ? +(top / txs.length).toFixed(3) : 0,
    sol_in_sample: +solIn.toFixed(4),
    sol_out_sample: +solOut.toFixed(4),
    programs_known: known,
    unknown_programs: unknown.size,
    unknown_program_calls: unknownCalls,
    program_calls: calls,
    activity_types: types,
    token_creations: creations,
    flagged_self: flagged[address] ? { listed: true, reason: flagged[address] } : { listed: false },
    flagged_counterparties: flaggedCps,
    drain_pattern: ageDays !== null && ageDays < 7 && solIn > 0.5 && solOut > 0.9 * solIn,
    funding,
  };
}
