// Transaction inspection: what does this transaction take out of the guarded wallet, to whom, and what else does it do?
// Decodes System, SPL Token, Token-2022 and Associated Token Account instructions directly. Token accounts are resolved
// to the wallet that owns them, including accounts created in the same transaction. Instructions that hand over control
// of the wallet or its tokens are reported as risky. Value moved inside other programs is reported, not guessed.
import type { Connection, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { KNOWN_PROGRAMS } from './programs.js';
import type { Outflow, RiskyInstruction } from './policy.js';

const SYSTEM = '11111111111111111111111111111111';
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
// programs that never move value on their own
const INERT = new Set([SYSTEM, TOKEN, TOKEN22, ATA, 'ComputeBudget111111111111111111111111111111', 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo', 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV', 'AddressLookupTab1e1111111111111111111111111']);

export type Inspection = {
  payer: string;
  /** the wallet being guarded (option `wallet`, default the fee payer) */
  wallet: string;
  outflows: Outflow[];
  programs: string[];
  unknownPrograms: string[];
  /** names of well-known programs called that can move value the guard does not decode */
  valuePrograms: string[];
  risky: RiskyInstruction[];
  notes: string[];
};

type Ix = { programId: string; accounts: string[]; data: Uint8Array };

const u64 = (d: Uint8Array, o: number) => Number(new DataView(d.buffer, d.byteOffset + o, 8).getBigUint64(0, true));
const u32 = (d: Uint8Array, o: number) => new DataView(d.buffer, d.byteOffset + o, 4).getUint32(0, true);
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function isVersioned(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
  return 'version' in tx;
}

/** Flatten a legacy or versioned transaction into plain instructions, resolving address lookup tables. */
export async function instructionsOf(tx: Transaction | VersionedTransaction, connection?: Connection): Promise<{ payer: string; ixs: Ix[] }> {
  if (!isVersioned(tx)) {
    const payer = (tx.feePayer ?? tx.instructions[0]?.keys.find((k) => k.isSigner)?.pubkey)?.toBase58() ?? '';
    return { payer, ixs: tx.instructions.map((ix) => ({ programId: ix.programId.toBase58(), accounts: ix.keys.map((k) => k.pubkey.toBase58()), data: Uint8Array.from(ix.data) })) };
  }
  const msg = tx.message;
  const luts = [];
  for (const l of msg.addressTableLookups ?? []) {
    if (!connection) throw new Error('a Connection is needed to resolve address lookup tables');
    const res = await connection.getAddressLookupTable(l.accountKey);
    if (!res.value) throw new Error(`lookup table ${l.accountKey.toBase58()} not found`);
    luts.push(res.value);
  }
  const keys = msg.getAccountKeys({ addressLookupTableAccounts: luts });
  const k = (i: number) => (keys.get(i) as PublicKey).toBase58();
  return {
    payer: k(0),
    ixs: msg.compiledInstructions.map((ix) => ({ programId: k(ix.programIdIndex), accounts: ix.accountKeyIndexes.map(k), data: ix.data })),
  };
}

/** Decode what leaves `wallet` (default: the fee payer). Token destinations are resolved to their owner via RPC when needed. */
export async function inspectTransaction(tx: Transaction | VersionedTransaction, connection?: Connection, opts: { wallet?: string } = {}): Promise<Inspection> {
  const { payer, ixs } = await instructionsOf(tx, connection);
  const wallet = opts.wallet ?? payer;
  const outflows: Outflow[] = [];
  const risky: RiskyInstruction[] = [];
  const notes: string[] = [];
  const programs = new Set<string>();
  // token accounts created in this transaction: ata -> { owner, mint }  (Create = 0 / empty data, CreateIdempotent = 1)
  const created = new Map<string, { owner: string; mint: string }>();
  for (const ix of ixs) if (ix.programId === ATA && (ix.data.length === 0 || ix.data[0] <= 1) && ix.accounts.length >= 4) created.set(ix.accounts[1], { owner: ix.accounts[2], mint: ix.accounts[3] });

  const pendingTokens: { account: string; raw: number; decimals?: number; mint?: string; authority: string; instruction: string }[] = [];
  const sol = (from: string, to: string, lamports: number, instruction: string) => outflows.push({ kind: 'sol', from, to, toAccount: to, amount: lamports / 1e9, instruction });

  for (const ix of ixs) {
    programs.add(ix.programId);
    const a = ix.accounts, d = ix.data;
    if (ix.programId === SYSTEM && d.length >= 4) {
      const op = u32(d, 0);
      if (op === 0 && d.length >= 12) sol(a[0], a[1], u64(d, 4), 'system.createAccount');
      else if (op === 2 && d.length >= 12) sol(a[0], a[1], u64(d, 4), 'system.transfer');
      else if (op === 11 && d.length >= 12) sol(a[1], a[2], u64(d, 4), 'system.transferWithSeed');
      else if (op === 3 && d.length >= 44) {
        const seedLen = u64(d, 36);
        if (d.length >= 44 + seedLen + 8) sol(a[0], a[1], u64(d, 44 + seedLen), 'system.createAccountWithSeed');
      } else if (op === 5 && d.length >= 12) sol(a[4], a[1], u64(d, 4), 'system.withdrawNonceAccount');
      else if ((op === 1 || op === 10) && a[0] === wallet) risky.push({ instruction: 'system.assign', message: `Reassigns the wallet ${short(wallet)} to another program` });
    } else if ((ix.programId === TOKEN || ix.programId === TOKEN22) && d.length >= 1) {
      const op = d[0];
      if (op === 3 && d.length >= 9) pendingTokens.push({ account: a[1], raw: u64(d, 1), authority: a[2], instruction: 'token.transfer' });
      else if (op === 12 && d.length >= 10) pendingTokens.push({ account: a[2], raw: u64(d, 1), decimals: d[9], mint: a[1], authority: a[3], instruction: 'token.transferChecked' });
      else if (op === 26 && d[1] === 1 && d.length >= 11) pendingTokens.push({ account: a[2], raw: u64(d, 2), decimals: d[10], mint: a[1], authority: a[3], instruction: 'token.transferCheckedWithFee' });
      else if ((op === 4 && a[2] === wallet) || (op === 13 && a[3] === wallet)) risky.push({ instruction: 'token.approve', message: `Lets ${short(op === 4 ? a[1] : a[2])} spend tokens from ${short(a[0])}` });
      else if (op === 6 && a[1] === wallet) risky.push({ instruction: 'token.setAuthority', message: `Changes an authority on ${short(a[0])}, which the wallet controls` });
      else if (op === 9 && a[2] === wallet && a[1] !== wallet) risky.push({ instruction: 'token.closeAccount', message: `Closes ${short(a[0])} and sends its lamports (all wrapped SOL) to ${short(a[1])}` });
    }
  }

  // resolve token destinations to owners (and mint/decimals for plain `transfer`)
  const { PublicKey: PK } = connection ? await import('@solana/web3.js') : { PublicKey: undefined };
  for (const t of pendingTokens) {
    let owner: string | undefined, mint = t.mint, decimals = t.decimals;
    const c = created.get(t.account);
    if (c) { owner = c.owner; mint ??= c.mint; }
    if ((!owner || decimals === undefined) && connection && PK) {
      const info = await connection.getParsedAccountInfo(new PK(t.account));
      const parsed = (info.value?.data as { parsed?: { info?: { owner?: string; mint?: string; tokenAmount?: { decimals?: number } } } })?.parsed?.info;
      owner ??= parsed?.owner; mint ??= parsed?.mint; decimals ??= parsed?.tokenAmount?.decimals;
      if (decimals === undefined && mint) {
        const m = await connection.getParsedAccountInfo(new PK(mint));
        decimals = (m.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed?.info?.decimals;
      }
    }
    if (!owner) notes.push(`could not resolve the owner of token account ${t.account}; scored as-is`);
    outflows.push({ kind: 'token', from: t.authority, to: owner ?? t.account, toAccount: t.account, amount: decimals === undefined ? t.raw : t.raw / 10 ** decimals, mint, decimalsKnown: decimals !== undefined, instruction: t.instruction });
  }

  const all = [...programs];
  const unknownPrograms = all.filter((p) => !INERT.has(p) && !KNOWN_PROGRAMS[p]);
  const valuePrograms = all.filter((p) => !INERT.has(p) && KNOWN_PROGRAMS[p]).map((p) => KNOWN_PROGRAMS[p]);
  for (const p of all) if (!INERT.has(p)) notes.push(`calls ${KNOWN_PROGRAMS[p] ?? p}: value moved inside this program is not decoded`);
  // only value that leaves the guarded wallet counts; transfers between other parties in the same transaction do not
  const mine = outflows.filter((o) => o.from === wallet && o.to !== wallet && o.amount > 0);
  if (mine.length < outflows.filter((o) => o.amount > 0).length) notes.push('some transfers in this transaction are not from the guarded wallet and were not counted');
  return { payer, wallet, outflows: mine, programs: all, unknownPrograms, valuePrograms, risky, notes };
}
