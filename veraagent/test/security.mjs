// Security regression tests: each one pins a hole found in review. Read-only, nothing is ever sent.
import assert from 'node:assert/strict';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Vera, VeraGuard, inspectTransaction, evaluatePolicy } from '../dist/index.js';

const FLAGGED = '293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy';
const TRADER = 'AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51';
const API = process.env.VERA_API_URL;
const connection = new Connection(process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com', 'confirmed');
const payer = Keypair.generate();
const blockhash = '11111111111111111111111111111111';
const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const key = (pubkey, isSigner = false) => ({ pubkey, isSigner, isWritable: true });
const R = (tier, address = 'A'.repeat(32)) => ({ address, ok: true, score: tier === 'unknown' ? null : 90, tier, reasons: [], attestationId: 'i', verified: true, expired: false });

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
console.log('veralayer security tests\n');

await t('a result for a different address is rejected', async () => {
  // a mirror that answers every request with the trader's genuine, signed result
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/v1/check')) return realFetch(url, { ...init, body: JSON.stringify({ address: TRADER }) });
    return realFetch(url, init);
  };
  try {
    const d = await new VeraGuard({ vera: { apiUrl: API } }).evaluatePayment({ to: FLAGGED, amountSol: 0.1 });
    assert.equal(d.action, 'block');
    assert.equal(d.findings[0].code, 'check_failed');
    assert.match(d.findings[0].message, /different address/);
  } finally { globalThis.fetch = realFetch; }
});

await t('the issuer key is pinned by default', async () => {
  const real = await new Vera({ apiUrl: API }).check(TRADER);
  const v = await new Vera().verify({ attestation: { ...real.attestation, issuer: Keypair.generate().publicKey.toBase58() }, signature: real.signature });
  assert.equal(v.valid, false);
  assert.match(v.reason, /trusted Vera key/);
});

await t('NaN, negative and infinite amounts block', () => {
  for (const amount of [NaN, -5, Infinity]) {
    const d = evaluatePolicy({ outflows: [{ kind: 'sol', to: 'A'.repeat(32), toAccount: 'A'.repeat(32), amount, instruction: 'x' }], recipients: [R('high')], policy: { dailyLimitSol: 1 } });
    assert.equal(d.action, 'block', `amount ${amount}`);
    assert.equal(d.findings[0].code, 'bad_amount');
  }
});

await t('policy typos throw instead of weakening checks', () => {
  assert.throws(() => new VeraGuard({ policy: { minTier: 'hgh' } }), /invalid minTier/);
  assert.throws(() => new VeraGuard({ policy: { dailyLimitSol: 'abc' } }), /invalid dailyLimitSol/);
  assert.throws(() => new VeraGuard({ policy: { onCheckError: 'allow' } }), /onCheckError/);
});

await t('an unexpected tier from the API counts as a failed check', () => {
  const d = evaluatePolicy({ outflows: [{ kind: 'sol', to: 'A'.repeat(32), toAccount: 'A'.repeat(32), amount: 100, instruction: 'x' }], recipients: [R('critical')] });
  assert.equal(d.action, 'block');
  assert.equal(d.findings[0].code, 'bad_tier');
});

await t('unknown recipients default to review', () => {
  const d = evaluatePolicy({ outflows: [{ kind: 'sol', to: 'A'.repeat(32), toAccount: 'A'.repeat(32), amount: 1, instruction: 'x' }], recipients: [R('unknown')] });
  assert.equal(d.action, 'review');
  assert.equal(d.findings[0].code, 'unknown_recipient');
});

await t('token approve signed by the wallet is blocked', async () => {
  const data = Buffer.alloc(9); data[0] = 4; data.writeBigUInt64LE(10n ** 12n, 1);
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    new TransactionInstruction({ programId: TOKEN, data, keys: [key(Keypair.generate().publicKey), key(Keypair.generate().publicKey), key(payer.publicKey, true)] }));
  const d = await new VeraGuard({ connection }).evaluate(tx);
  assert.equal(d.action, 'block');
  assert.equal(d.findings[0].code, 'risky_instruction');
});

await t('closeAccount sending wrapped SOL elsewhere is blocked', async () => {
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    new TransactionInstruction({ programId: TOKEN, data: Buffer.from([9]), keys: [key(Keypair.generate().publicKey), key(new PublicKey(FLAGGED)), key(payer.publicKey, true)] }));
  const d = await new VeraGuard({ connection }).evaluate(tx);
  assert.equal(d.action, 'block');
  assert.ok(d.findings.some((f) => f.code === 'risky_instruction' && /Closes/.test(f.message)));
});

await t('only transfers from the guarded wallet count (relayer pays fees)', async () => {
  const relayer = Keypair.generate(), agent = Keypair.generate(), stranger = Keypair.generate();
  const tx = new Transaction({ feePayer: relayer.publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({ fromPubkey: agent.publicKey, toPubkey: new PublicKey(TRADER), lamports: 1_000_000_000 }),
    SystemProgram.transfer({ fromPubkey: stranger.publicKey, toPubkey: new PublicKey(FLAGGED), lamports: 5_000_000_000 }),
  );
  const ins = await inspectTransaction(tx, connection, { wallet: agent.publicKey.toBase58() });
  assert.equal(ins.outflows.length, 1);
  assert.equal(ins.outflows[0].to, TRADER);
  assert.equal((await inspectTransaction(tx, connection)).outflows.length, 0, 'default wallet is the fee payer');
});

await t('a well-known DeFi program goes to review unless allowed', async () => {
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    new TransactionInstruction({ programId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'), keys: [], data: Buffer.from([1]) }));
  assert.equal((await new VeraGuard({ connection }).evaluate(tx)).findings[0].code, 'opaque_value');
  assert.equal((await new VeraGuard({ connection, policy: { knownPrograms: 'allow' } }).evaluate(tx)).action, 'allow');
});

await t('concurrent sends cannot both pass a daily limit', async () => {
  const mk = () => new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(TRADER), lamports: 6_000_000_000 }));
  const fakeConn = { sendTransaction: async () => 'sig' };
  const g = new VeraGuard({ connection: fakeConn, policy: { allow: [TRADER], dailyLimitSol: 10 } });
  const res = await Promise.allSettled([g.sendTransaction(mk(), [payer]), g.sendTransaction(mk(), [payer])]);
  assert.equal(res.filter((r) => r.status === 'fulfilled').length, 1, 'exactly one 6 SOL send fits under 10 SOL');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
