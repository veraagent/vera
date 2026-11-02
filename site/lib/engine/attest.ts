// Signed attestations. The canonical JSON of the attestation is signed with Vera's ed25519 key;
// anyone can verify it with the public key published at /.well-known/vera.json.
// Optionally the attestation id (sha256 of the canonical JSON) is anchored on Solana in a Memo transaction.
import fs from 'node:fs';
import path from 'node:path';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import bs58 from 'bs58';
import { config } from './config';

export type Attestation = {
  v: 1;
  issuer: string; // base58 ed25519 public key (a Solana address)
  subject: string;
  score: number | null;
  tier: string;
  reasons: { kind: string; text: string }[];
  features_sha256: string;
  method: string;
  issued_at: string;
  expires_at: string;
};
export type Signed = { id: string; attestation: Attestation; signature: string; anchor?: { cluster: string; tx: string } | null };

// stable, key-sorted JSON so the same attestation always produces the same bytes
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
const enc = new TextEncoder();
export const hashHex = (s: string) => bytesToHex(sha256(enc.encode(s)));

let signer: { secret: Uint8Array; publicKey: string } | null = null;
export function getSigner() {
  if (signer) return signer;
  let secret: Uint8Array;
  if (process.env.VERA_SIGNER_SECRET) secret = bs58.decode(process.env.VERA_SIGNER_SECRET).slice(0, 32);
  else if (fs.existsSync(config.signerPath)) secret = bs58.decode(JSON.parse(fs.readFileSync(config.signerPath, 'utf8')).secretKey).slice(0, 32);
  else if (process.env.VERCEL) throw new Error('VERA_SIGNER_SECRET is not set: a serverless deploy needs a fixed signing key');
  else {
    secret = ed25519.utils.randomSecretKey();
    fs.mkdirSync(path.dirname(config.signerPath), { recursive: true });
    const pub = bs58.encode(ed25519.getPublicKey(secret));
    fs.writeFileSync(config.signerPath, JSON.stringify({ publicKey: pub, secretKey: bs58.encode(secret) }), { mode: 0o600 });
  }
  signer = { secret, publicKey: bs58.encode(ed25519.getPublicKey(secret)) };
  return signer;
}

export function sign(a: Omit<Attestation, 'issuer' | 'v'>): Signed {
  const s = getSigner();
  const attestation: Attestation = { v: 1, issuer: s.publicKey, ...a };
  const bytes = canonical(attestation);
  return { id: hashHex(bytes), attestation, signature: bs58.encode(ed25519.sign(enc.encode(bytes), s.secret)) };
}

export function verify(attestation: Attestation, signature: string, trustedIssuer?: string): { valid: boolean; expired: boolean; reason?: string } {
  if (trustedIssuer && attestation.issuer !== trustedIssuer) return { valid: false, expired: false, reason: 'issuer is not the trusted Vera key' };
  let ok = false;
  try { ok = ed25519.verify(bs58.decode(signature), enc.encode(canonical(attestation)), bs58.decode(attestation.issuer)); } catch { ok = false; }
  const expired = Date.parse(attestation.expires_at) < Date.now();
  return ok ? { valid: true, expired } : { valid: false, expired, reason: 'signature does not match' };
}

// Memo anchor: "vera:v1:<id>" signed by the Vera key. Costs ~0.000005 SOL per check; the key must hold SOL.
export async function anchor(id: string): Promise<{ cluster: string; tx: string } | null> {
  if (config.anchor === 'off') return null;
  const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, sendAndConfirmTransaction } = await import('@solana/web3.js');
  const url = config.anchor === 'devnet' ? 'https://api.devnet.solana.com' : config.rpcUrl;
  const conn = new Connection(url, 'confirmed');
  const kp = Keypair.fromSeed(getSigner().secret);
  const ix = new TransactionInstruction({ keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: false }], programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), data: Buffer.from(`vera:v1:${id}`) });
  const tx = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [kp]);
  return { cluster: config.anchor, tx };
}
