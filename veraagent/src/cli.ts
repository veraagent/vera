#!/usr/bin/env node
// npx veralayer check <address>            score one address
// npx veralayer pay <address> <sol>        what the guard would decide for a SOL payment
// npx veralayer inspect <base64 tx>        decode a transaction and decide on it
// options: --min-tier high|medium|low  --daily <sol>  --max-tx <sol>  --json  --api <url>  --rpc <url>
import { Vera } from './client.js';
import { VeraGuard } from './guard.js';
import type { Decision, Policy } from './policy.js';

const args = process.argv.slice(2);
// supports --name value and --name=value
const flags = new Map<string, string>();
const pos: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json') { flags.set('json', '1'); continue; }
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split(/=(.*)/s);
    if (v !== undefined) flags.set(k, v);
    else flags.set(k, args[++i] ?? '');
    continue;
  }
  pos.push(a);
}
const flag = (name: string) => flags.get(name);
const json = flags.has('json');
const [cmd, a1, a2] = pos;
const num = (name: string) => {
  const v = flag(name);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) { console.error(`--${name} must be a non-negative number`); process.exit(1); }
  return n;
};
const minTier = flag('min-tier');
if (minTier !== undefined && !['high', 'medium', 'low'].includes(minTier)) { console.error('--min-tier must be high, medium or low'); process.exit(1); }

const daily = num('daily'), maxTx = num('max-tx');
const policy: Policy = {
  ...(minTier ? { minTier: minTier as Policy['minTier'] } : {}),
  ...(daily !== undefined ? { dailyLimitSol: daily } : {}),
  ...(maxTx !== undefined ? { maxSolPerTx: maxTx } : {}),
};
const vera = new Vera({ apiUrl: flag('api') ?? process.env.VERA_API_URL, apiKey: process.env.VERA_API_KEY, issuer: process.env.VERA_ISSUER });

const c = process.stdout.isTTY ? { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' } : { r: '', g: '', y: '', d: '', b: '', x: '' };
const tierColor = (t: string) => (t === 'high' ? c.g : t === 'medium' ? c.y : t === 'low' ? c.r : c.d);
const glyph = (k: string) => (k === 'ok' ? `${c.g}✓${c.x}` : k === 'warn' ? `${c.y}!${c.x}` : k === 'bad' ? `${c.r}×${c.x}` : `${c.d}i${c.x}`);

function printDecision(d: Decision) {
  const col = d.action === 'allow' ? c.g : d.action === 'review' ? c.y : c.r;
  console.log(`\n${c.b}${col}${d.action.toUpperCase()}${c.x}  ${d.totalSol ? `${d.totalSol} SOL out` : ''}`);
  for (const o of d.outflows) console.log(`  ${c.d}→${c.x} ${o.amount} ${o.kind === 'sol' ? 'SOL' : (o.mint ?? 'token').slice(0, 6) + '…'} to ${o.to}`);
  for (const r of d.recipients) {
    if (!r.ok) { console.log(`  ${c.r}×${c.x} ${r.address}: ${r.error}`); continue; }
    console.log(`  ${tierColor(r.tier)}${r.tier.toUpperCase()} ${r.score ?? '—'}${c.x} ${r.address} ${r.verified ? `${c.d}signature ✓${c.x}` : `${c.r}signature ✗${c.x}`}`);
  }
  for (const f of d.findings) console.log(`  ${f.action === 'block' ? c.r : c.y}${f.action}${c.x}  ${f.message}`);
  if (!d.findings.length) console.log(`  ${c.d}no policy findings${c.x}`);
}

async function main() {
  if (cmd === 'mcp') { const { runMcp } = await import('./mcp.js'); return runMcp({ apiUrl: flag('api') ?? process.env.VERA_API_URL, apiKey: process.env.VERA_API_KEY }); }
  if (cmd === 'check' && a1) {
    const r = await vera.check(a1);
    const v = await vera.verify(r);
    if (json) return console.log(JSON.stringify({ ...r, verified: v }, null, 2));
    const a = r.attestation;
    console.log(`\n${c.b}${tierColor(a.tier)}${a.score ?? '—'}/100 ${a.tier.toUpperCase()}${c.x}  ${a.subject}`);
    if (r.summary) console.log(`${c.d}${r.summary}${c.x}`);
    for (const x of a.reasons) console.log(`  ${glyph(x.kind)} ${x.text}`);
    console.log(`\n${c.d}attestation ${r.id}\nsignature ${v.valid ? 'verified' : 'INVALID'} · ${a.method} · expires ${a.expires_at}${c.x}`);
    return;
  }
  if (cmd === 'pay' && a1 && a2) {
    if (!Number.isFinite(Number(a2)) || Number(a2) < 0) throw new Error(`invalid amount: ${a2}`);
    const d = await new VeraGuard({ vera, policy }).evaluatePayment({ to: a1, amountSol: Number(a2) });
    return json ? console.log(JSON.stringify(d, null, 2)) : printDecision(d);
  }
  if (cmd === 'inspect' && a1) {
    const web3 = await import('@solana/web3.js').catch(() => { throw new Error('inspect needs @solana/web3.js: npm i @solana/web3.js'); });
    const raw = Buffer.from(a1, 'base64');
    let tx;
    try { tx = web3.VersionedTransaction.deserialize(raw); } catch { tx = web3.Transaction.from(raw); }
    const connection = new web3.Connection(flag('rpc') ?? process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
    const d = await new VeraGuard({ vera, policy, connection }).evaluate(tx);
    return json ? console.log(JSON.stringify(d, null, 2)) : printDecision(d);
  }
  console.log(`veralayer: payment guard for AI agents on Solana

  veralayer check <address>          score an address (signed, verified locally)
  veralayer pay <address> <sol>      decide on a planned SOL payment
  veralayer inspect <base64 tx>      decode a transaction and decide on it
  veralayer mcp                      run as an MCP server over stdio

  --min-tier high|medium|low   --daily <sol>   --max-tx <sol>   --json
  --api <url> (or VERA_API_URL)   --rpc <url> (or SOLANA_RPC_URL)`);
  process.exitCode = cmd ? 1 : 0;
}

main().then(() => {}, (e) => { console.error(`${c.r}error${c.x} ${(e as Error).message}`); process.exitCode = 1; });
