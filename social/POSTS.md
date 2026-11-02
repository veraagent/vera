# Vera Agent: X kit

All images are in `social/images/`. Every one is built from the real product: real CLI output, real API results, the live simulator and the public result page. Rebuild them with `node render.mjs` while the site is running locally.

Links in every post point to **veraagent.io**.

---

## Profile

**Name:** Vera Agent

**Bio (pick one, ≤160 characters):**

1. `A payment guard for AI agents on Solana. Decodes the transaction, scores every recipient, enforces your policy before anything is signed.`
2. `Your agent signs. Vera checks first. Signed trust scores + spending policy for agents on Solana. npm install veralayer`
3. `Before an AI agent pays, Vera reads the recipient's on-chain history, signs the score, and blocks what breaks your policy.`

**Location:** `npm install veralayer`
**Website:** `veraagent.io`
**Avatar:** `images/x-avatar.png` (400×400)
**Header:** `images/x-header.png` (1500×500; the bottom-left is kept clear for the avatar)
**Pinned:** post 1

---

## Posting order

Posts 6 (MCP) and 7 (Python) describe features that are not on npm or PyPI yet. Hold them until `veralayer@0.2.0` is on npm and `veralayer` is on PyPI.

| # | Image | Topic |
|---|---|---|
| 1 | `01-launch.png` | Launch |
| 2 | `02-decode.png` | What the guard decodes |
| 3 | `05-scoring.png` | How the score is built |
| 4 | `04-signed.png` | Signed results |
| 5 | `08-cli.png` | CLI: allow / review / block |
| 6 | `06-mcp.png` | MCP (after 0.2.0) |
| 7 | `07-python.png` | Python (after PyPI) |
| 8 | `03-policy.png` | Policy as code |
| 9 | `09-fail-closed.png` | Fails closed |
| 10 | `10-review.png` | Human review |

---

## 1 · Launch

> Your agent signs. Vera checks first.
>
> veralayer is a payment guard for AI agents on Solana:
> → decodes every outgoing transaction
> → scores each recipient from on-chain history
> → enforces your spending policy before anything is signed
>
> npm install veralayer
>
> veraagent.io

Image: `01-launch.png`

**Reply under it:**

> Swap one call:
>
> connection.sendTransaction(tx, [agent])
> → guard.sendTransaction(tx, [agent])
>
> Blocked transactions throw with the reason. Nothing reaches the network.
>
> Docs: veraagent.io/docs

---

## 2 · What the guard decodes

> Agents don't send "payments". They sign transactions.
>
> So the guard reads the transaction itself:
> · SOL transfers, incl. createAccount and nonce withdrawals
> · SPL + Token-2022 transfers, with each token account resolved to the wallet that owns it
> · v0 lookup tables
> · approve / setAuthority / closeAccount, which are blocked by default

Image: `02-decode.png`

---

## 3 · How the score is built

> How Vera scores a recipient:
>
> 1. Read: up to 3,000 signatures and the last 100 transactions parsed, plus who funded the wallet
> 2. Score: a deterministic 0–100 from on-chain features
> 3. Explain: Claude Opus 5.5 may move it ±15, and every reason must cite a feature
> 4. Sign: ed25519
>
> Rules first, the model second.

Image: `05-scoring.png`

---

## 4 · Signed results

> Every Vera score is signed (ed25519 over key-sorted JSON).
>
> The library verifies it against a key pinned in the package before your policy runs. If a proxy changes one byte, or swaps in a result for another address, the payment is blocked.
>
> Each result also has a public page: veraagent.io/a/<id>

Image: `04-signed.png`

---

## 5 · CLI

> Three payments, three decisions:
>
> npx veralayer pay <address> <sol>
>
> 1 SOL to a busy trader → ALLOW
> 12 SOL to the same wallet → REVIEW (over the 5 SOL medium-tier cap)
> 1 SOL to a flagged wallet → BLOCK
>
> Real output, mainnet data.

Image: `08-cli.png`

---

## 6 · MCP (post after 0.2.0 is on npm)

> Give Claude a payment check.
>
> One line in claude_desktop_config.json:
> "vera": { "command": "npx", "args": ["-y", "veralayer", "mcp"] }
>
> Tools: vera_check, vera_guard_payment
> Works in Claude Desktop, Claude Code, Cursor, any MCP client.

Image: `06-mcp.png`

---

## 7 · Python (post after the PyPI release)

> veralayer is now on PyPI.
>
> pip install veralayer
>
> Same policy engine and finding codes as the JS package. Signatures verify byte for byte across both, so a result checked in Python verifies in Node.
>
> One dependency: cryptography.

Image: `07-python.png`

---

## 8 · Policy as code

> Spending rules, in code:
>
> minTier: 'medium'
> tierLimitsSol: { high: 50, medium: 5 }
> dailyLimitSol: 20
> tokenLimits: { [USDC]: 500 }
>
> Every decision comes back as allow, review or block, with a finding code you can switch on (tier_limit, daily_limit, risky_instruction…).
>
> A policy with a typo throws at startup instead of silently weakening a check.

Image: `03-policy.png`

---

## 9 · Fails closed

> If Vera can't answer, nothing gets paid.
>
> These are the defaults:
> · API down, forged signature, or a result for the wrong address → block
> · recipient with no history → review
> · NaN or negative amount → block
>
> A guard that fails open isn't a guard.

Image: `09-fail-closed.png`

---

## 10 · Human review

> Big payments wait for a human.
>
> Over a tier cap → review. Pass onReview and approve from Telegram, Slack, wherever:
>
> onReview: (d) => askInTelegram(d.findings)
>
> Every decision also goes to onDecision with the rule that fired, which gives you an audit trail for free.

Image: `10-review.png`

---

## Short standalone posts (no image)

- `Token accounts aren't wallets. Paying "7xKq…" might mean paying whoever owns it. veralayer resolves the owner, even for an ATA created in the same transaction.`
- `Two parallel sends, 6 SOL each, daily limit 10. One goes through, the other is blocked. The guard reserves spend before sending and serialises concurrent sends.`
- `Running behind a fee relayer? Pass wallet: agent.publicKey and only transfers from the agent's wallet count toward its limits.`
- `A score reads history, not intent. Use tiers *and* limits. veralayer gives you both in one policy object.`
- `Every Vera result expires after 24h. An expired result sends the payment to review, never straight through.`
