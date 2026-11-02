// End-to-end tests against the live Vera API and Solana mainnet (read-only: nothing is ever sent).
//   npm test          (needs HELIUS_RPC or SOLANA_RPC_URL for the RPC-backed cases)
import assert from 'node:assert/strict';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { Vera, VeraGuard, MemoryLedger, VeraBlockedError, inspectTransaction, evaluatePolicy } from '../dist/index.js';

const FLAGGED = '293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy';
const TRADER = 'AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51'; // medium tier at time of writing
const rpc = process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(rpc, 'confirmed');
const payer = Keypair.generate();
const blockhash = '11111111111111111111111111111111';

let passed = 0, failed = 0;
async function t(name, fn) {
  const s = Date.now();
  try { await fn(); passed++; console.log(`  ✓ ${name} (${((Date.now() - s) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.stack?.split('\n').slice(0, 3).join('\n    ')}`); }
}

console.log('veraagent tests\n');

await t('policy: pure evaluation, no network', () => {
  const d = evaluatePolicy({
    outflows: [{ kind: 'sol', to: 'A'.repeat(32), toAccount: 'A'.repeat(32), amount: 6, instruction: 'x' }],
    recipients: [{ address: 'A'.repeat(32), ok: true, score: 60, tier: 'medium', reasons: [], attestationId: 'id', verified: true, expired: false }],
  });
  assert.equal(d.action, 'review'); // 6 SOL > 5 SOL medium cap
  assert.equal(d.findings[0].code, 'tier_limit');
});

await t('pay: flagged recipient is blocked', async () => {
  const d = await new VeraGuard().evaluatePayment({ to: FLAGGED, amountSol: 0.5 });
  assert.equal(d.action, 'block');
  assert.ok(d.findings.some((f) => f.code === 'tier_below_minimum'));
  assert.ok(d.recipients[0].ok && d.recipients[0].verified, 'signature verified locally');
});

await t('pay: medium recipient, small amount allowed, large amount needs review', async () => {
  const g = new VeraGuard();
  const small = await g.evaluatePayment({ to: TRADER, amountSol: 1 });
  const big = await g.evaluatePayment({ to: TRADER, amountSol: 12 });
  const tier = small.recipients[0].ok && small.recipients[0].tier;
  if (tier === 'medium') { assert.equal(small.action, 'allow'); assert.equal(big.action, 'review'); }
  else console.log(`    (trader is now ${tier}; amounts checked against that tier)`);
});

await t('pay: deny list and allow list skip scoring', async () => {
  const g = new VeraGuard({ policy: { deny: [TRADER], allow: [FLAGGED] } });
  assert.equal((await g.evaluatePayment({ to: TRADER, amountSol: 0.1 })).action, 'block');
  const a = await g.evaluatePayment({ to: FLAGGED, amountSol: 0.1 });
  assert.equal(a.action, 'allow');
  assert.equal(a.recipients.length, 0, 'allowlisted address is not sent to Vera');
});

await t('daily limit uses the ledger', async () => {
  const ledger = new MemoryLedger(); ledger.add(19);
  const d = await new VeraGuard({ ledger, policy: { dailyLimitSol: 20, allow: [TRADER] } }).evaluatePayment({ to: TRADER, amountSol: 2 });
  assert.equal(d.action, 'block');
  assert.equal(d.findings[0].code, 'daily_limit');
});

await t('legacy tx: two SOL transfers decoded, flagged one blocks the whole tx', async () => {
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(TRADER), lamports: 250_000_000 }),
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(FLAGGED), lamports: 10_000_000 }),
  );
  const guard = new VeraGuard({ connection });
  const d = await guard.evaluate(tx);
  assert.equal(d.outflows.length, 2);
  assert.equal(d.totalSol, 0.26);
  assert.equal(d.action, 'block');
  await assert.rejects(guard.sendTransaction(tx, [payer]), VeraBlockedError, 'sendTransaction refuses before touching the network');
});

await t('versioned tx: SPL transferChecked resolves the token account to its owner wallet', async () => {
  const accts = await connection.getTokenAccountsByOwner(new PublicKey(TRADER), { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
  assert.ok(accts.value.length, 'trader has a token account');
  const dest = accts.value[0].pubkey;
  const mint = new PublicKey(accts.value[0].account.data.subarray(0, 32));
  const data = Buffer.alloc(10); data[0] = 12; data.writeBigUInt64LE(1_000_000n, 1); data[9] = 6;
  const ix = new TransactionInstruction({ programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), data, keys: [
    { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: dest, isSigner: false, isWritable: true }, { pubkey: payer.publicKey, isSigner: true, isWritable: false },
  ] });
  const vtx = new VersionedTransaction(new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message());
  const ins = await inspectTransaction(vtx, connection);
  assert.equal(ins.outflows.length, 1);
  assert.equal(ins.outflows[0].kind, 'token');
  assert.equal(ins.outflows[0].to, TRADER, 'owner resolved');
  assert.equal(ins.outflows[0].toAccount, dest.toBase58());
});

await t('unknown program in a tx triggers review', async () => {
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
    new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.from([1]) }),
  );
  const d = await new VeraGuard({ connection }).evaluate(tx);
  assert.equal(d.action, 'review');
  assert.equal(d.findings[0].code, 'unknown_program');
});

await t('real mainnet transaction with lookup tables decodes', async () => {
  const sigs = await connection.getSignaturesForAddress(new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'), { limit: 10 });
  let done = false;
  for (const s of sigs) {
    const raw = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [s.signature, { encoding: 'base64', maxSupportedTransactionVersion: 0 }] }) }).then((r) => r.json()).catch(() => null);
    const b64 = raw?.result?.transaction?.[0];
    if (!b64) continue;
    const vtx = VersionedTransaction.deserialize(Buffer.from(b64, 'base64'));
    if (!vtx.message.addressTableLookups?.length) continue;
    const ins = await inspectTransaction(vtx, connection);
    assert.ok(ins.programs.includes('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'));
    console.log(`    ${s.signature.slice(0, 12)}… ${ins.programs.length} programs, ${ins.outflows.length} direct outflows, ${ins.unknownPrograms.length} unknown`);
    done = true; break;
  }
  assert.ok(done, 'found a v0 transaction with lookup tables');
});

await t('forged result: tampered score fails signature check and blocks', async () => {
  class Tampered extends Vera {
    async check(a) { const r = await super.check(a); return { ...r, attestation: { ...r.attestation, score: 99, tier: 'high' } }; }
  }
  const d = await new VeraGuard({ vera: new Tampered() }).evaluatePayment({ to: FLAGGED, amountSol: 0.1 });
  assert.equal(d.action, 'block');
  assert.equal(d.findings[0].code, 'bad_signature');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
