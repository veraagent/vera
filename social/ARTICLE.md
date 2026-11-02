# X Article

**Cover:** `images/article-cover.png` (1600×640, 5:2)

> Publish once `veralayer@0.2.0` is on npm and the Python package is on PyPI: the “Where it runs” section mentions MCP, Agent Kit and Python.

**Title:** Your agent can sign anything. We made it check first.

---

AI agents on Solana can now hold wallets and move real money. They buy data, pay other agents and settle invoices. The tooling for doing that has grown fast. The tooling for *not* doing it, when they shouldn't, hasn't.

Today an agent with a keypair will sign whatever its prompt, a tool result, or another agent talks it into. There is no second opinion between the model's decision and the network.

veralayer is that second opinion.

```
npm install veralayer
```

## The problem is the transaction, not the address

Most "is this address safe?" tools take an address and return a score. Agents don't pay addresses, though. They sign transactions, and a transaction can hide a lot:

- **Token accounts.** A USDC transfer goes to a token account, not a wallet. Scoring the token account tells you nothing. You have to find out who owns it, and sometimes it was created in the same transaction.
- **More than one recipient.** One transaction can pay three recipients.
- **Handing over control.** An `approve` or `setAuthority` instruction doesn't move a lamport today. It just hands someone else the keys to your tokens.
- **Emptying an account.** `closeAccount` can send an entire wrapped-SOL balance to an address nobody looked at.

So veralayer starts by decoding the transaction:

- SOL transfers, including `createAccount`, `createAccountWithSeed` and nonce withdrawals.
- SPL Token and Token-2022 transfers, including `transferCheckedWithFee`. Every token account is resolved to the wallet that owns it.
- v0 transactions, with their address lookup tables resolved.
- `approve`, `setAuthority`, `closeAccount` to someone else, and `assign` when the agent's wallet signs them. These are blocked by default.
- Any other program the transaction calls. Value that moves inside a swap or a lending program isn't decoded, and the guard says so instead of guessing.

Only value that leaves the guarded wallet counts. If a relayer pays the fees, you name the agent's wallet and the guard follows that one.

## Then every recipient gets scored

Each recipient is checked with Vera. Scoring has four steps, in this order:

1. **Read.** Up to 3,000 signatures for age and activity, the last 100 transactions parsed in detail, and the wallet that sent the first SOL.
2. **Score.** A deterministic 0–100 score built from features: wallet age, failed-transaction ratio, recurring counterparties, unrecognised programs, a drain pattern (a new wallet that sends out everything it receives), token launches, and matches against a flagged list for the address, its counterparties and its funder.
3. **Explain.** Claude Opus 5.5 reviews the features and writes the reasons. It can move the score by at most 15 points. Every reason has to cite a real feature or it's dropped, the tier is computed by the server rather than the model, and the model can never raise a flagged address.
4. **Sign.** The result is signed with ed25519.

The order is deliberate. The rules decide, the model explains, and the signature makes the result portable.

## Why signatures matter

A score you have to take on trust is just another API response. Vera's results are signed over key-sorted JSON, and the production key ships inside the package.

That gives three guarantees:

- **No forged scores.** A proxy, a cache or a compromised DNS entry can't pass off a forged score.
- **No swapped addresses.** A genuine result for a different address is rejected.
- **Portable proof.** Anyone can verify a result offline, in Node or Python. Both libraries produce the same bytes. Every result also has a public page at `veraagent.io/a/<id>` that verifies the signature in your browser.

## Then your policy decides

```ts
const guard = new VeraGuard({
  connection,
  policy: {
    minTier: 'medium',
    tierLimitsSol: { high: 50, medium: 5 },
    dailyLimitSol: 20,
    tokenLimits: { [USDC]: 500 },
  },
  onReview: (d) => askHuman(d),
});

await guard.sendTransaction(tx, [agent]);
```

Every decision is `allow`, `review` or `block`, with a finding code for each rule that fired. `block` beats `review`, and `review` beats `allow`.

Some details that matter in production:

- **It fails closed.** API down, a bad signature or a result for the wrong address means block. A recipient with no history means review.
- **Bad input blocks.** A NaN or negative amount is blocked, never allowed.
- **Typos throw.** A policy with a typo throws when the guard is created, so a misspelt tier can't quietly switch a check off.
- **Daily limits hold under load.** The spend is reserved before sending and released if the send fails. Concurrent sends are serialised, so two payments can't both slip under the limit.
- **Every decision is logged.** It goes to `onDecision`, which gives you an audit trail without extra work.

## Where it runs

- **Node:** `npm install veralayer`, with the guard, the scorer and the CLI.
- **MCP:** `npx -y veralayer mcp` gives Claude Desktop, Claude Code and Cursor two tools, `vera_check` and `vera_guard_payment`.
- **Solana Agent Kit:** `veralayer/agent-kit` adds the actions and methods.
- **Python:** `pip install veralayer` has the same policy engine for planned payments.

## What a score is not

A score reads history, not intent. A clean wallet can still be a bad counterparty tomorrow. That's why veralayer gives you limits and human review, not just tiers. Results are signed today. Anchoring them on-chain is next on the roadmap.

Your agent will keep signing. Now something checks first.

**veraagent.io · docs at veraagent.io/docs**
