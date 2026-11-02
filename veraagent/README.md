# veralayer

[![npm](https://img.shields.io/npm/v/veralayer)](https://www.npmjs.com/package/veralayer) [![PyPI](https://img.shields.io/pypi/v/veralayer)](https://pypi.org/project/veralayer/) [![license](https://img.shields.io/badge/license-MIT-black)](https://github.com/veraagent/vera/blob/main/veraagent/LICENSE)

A payment guard for AI agents on Solana. It sits between your agent's wallet and the network and checks every outgoing transaction:

- **Decodes the transaction.** It finds where value goes: SOL transfers, SPL and Token-2022 transfers (each token account is resolved to the wallet that owns it), v0 lookup tables, and every program called.
- **Scores each recipient.** Every recipient is checked with [Vera](https://veraagent.io). The score is built from on-chain history, and every reason cites the fact behind it.
- **Verifies the signature.** Each result is signed by Vera. The guard verifies that signature locally against Vera's published ed25519 key, so a tampered score is rejected.
- **Applies your policy.** It returns `allow`, `review` or `block`, with a finding for each rule that fired. Only allowed transactions are signed and sent.

```bash
npm install veralayer @solana/web3.js
```

## Guard a wallet

```ts
import { Connection } from '@solana/web3.js';
import { VeraGuard, VeraBlockedError } from 'veralayer';

const guard = new VeraGuard({
  connection: new Connection(process.env.RPC_URL!),
  policy: {
    minTier: 'medium',                              // block low-trust recipients
    tierLimitsSol: { high: 50, medium: 5 },         // max SOL per recipient per tx, by tier
    dailyLimitSol: 20,                              // across all transactions today
    tokenLimits: { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 500 }, // 500 USDC per tx
    deny: ['<known bad address>'],
    allow: ['<your treasury>'],
  },
  onReview: async (decision) => askHumanInTelegram(decision), // optional; without it, review = block
});

try {
  const { signature, decision } = await guard.sendTransaction(tx, [agentKeypair]);
} catch (e) {
  if (e instanceof VeraBlockedError) console.log(e.decision.findings); // why it was stopped
}
```

## Decide before you build a transaction

```ts
const d = await guard.evaluatePayment({ to: seller, amountSol: 1.5 });
if (d.action !== 'allow') return refuse(d.findings[0].message);
```

## Just score an address

```ts
import { Vera } from 'veralayer';
const vera = new Vera();
const r = await vera.check(address);   // { attestation: { score, tier, reasons, ... }, signature, summary }
await vera.verify(r);                  // { valid: true, expired: false }, checked offline
```

## Use it from Claude, Cursor or any MCP client

```json
{ "mcpServers": { "vera": { "command": "npx", "args": ["-y", "veralayer", "mcp"] } } }
```

Tools: `vera_check(address)` and `vera_guard_payment(to, amount_sol)`.

## Solana Agent Kit

```ts
import { createVeraPlugin } from 'veralayer/agent-kit';
agent.use(createVeraPlugin({ policy: { minTier: 'medium' } }));
```

Full docs: https://veraagent.io/docs

## CLI

```bash
npx veralayer check <address>
npx veralayer pay <address> 2.5 --min-tier medium --daily 20
npx veralayer inspect <base64 transaction> --rpc <url>
```

## Policy reference

| Field | Default | Effect |
|---|---|---|
| `minTier` | `'medium'` | Recipients below this tier are blocked. |
| `tierLimitsSol` | `{ high: ∞, medium: 5, low: 0 }` | Max SOL to one recipient per transaction. Over the limit → `review`; a limit of 0 → `block`. |
| `maxSolPerTx` | none | Total SOL per transaction → `block`. |
| `dailyLimitSol` | none | Total SOL per UTC day (ledger) → `block`. |
| `tokenLimits` | none | Per-mint cap in UI units → `review`. |
| `allow` / `deny` | `[]` | Skip scoring / always block. |
| `onUnknown` | `'review'` | Recipients with no history. |
| `onCheckError` | `'block'` | API failure, bad signature, or a result for another address. |
| `unknownPrograms` | `'review'` | Programs outside the well-known list. |
| `knownPrograms` | `'review'` | Well-known programs that move value the guard doesn't decode (swaps). Set `'allow'` if your agent swaps. |
| `riskyInstructions` | `'block'` | `approve`, `setAuthority`, `closeAccount` to someone else, or `assign`, signed by the wallet. |

A policy with a typo throws when the guard is created, rather than silently weakening a check.

## Trust

- **Pinned key.** Results must be signed by Vera's production key, which ships as `VERA_ISSUER`. For a self-hosted Vera, pass `vera: { apiUrl, issuer }`.
- **Address check.** A result for a different address than the one requested is rejected.
- **Bad amounts.** NaN, negative and infinite amounts block.
- **Daily limits.** Spend is reserved before sending and released if the send fails. Concurrent sends are serialised.
- **Relayers.** If a relayer pays fees, pass `wallet` so that only the agent's own transfers count.

## What it does not do (yet)

- **Value inside other programs.** Value moved inside swaps and other CPIs is not decoded. Those programs are listed, and unknown ones trigger `review`.
- **On-chain anchoring.** Vera's results are signed but not yet anchored on-chain.
- **Guarantees.** A score reads history, not intent. It is a risk signal, not a guarantee.

MIT · by [VeraLayer](https://veralayer.io)
