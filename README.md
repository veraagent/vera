# Vera Agent — brand, site, engine, SDK, integrations

[![npm](https://img.shields.io/npm/v/veralayer)](https://www.npmjs.com/package/veralayer) [![PyPI](https://img.shields.io/pypi/v/veralayer)](https://pypi.org/project/veralayer/) [![license](https://img.shields.io/badge/license-MIT-black)](https://github.com/veraagent/vera/blob/main/veraagent/LICENSE)

| Folder | What | Run |
|---|---|---|
| `brand/` | Logos, icons, palette, X creatives, OG image, guidelines, `index.html` preview | `cd brand && node build.mjs && node export.mjs` |
| `site/` | Next.js app on Vercel: landing page, live check widget **and the API** (`/v1/*`). The engine core lives in `site/lib/engine/` | `vercel deploy --prod` · live at https://veraagent.io |
| `engine/` | Standalone wrappers around the same core: Hono server, CLI, MCP server | `npm run dev` · `npm run check -- <address>` · `npm run mcp` |
| `veraagent/` | **The npm package** `veraagent`: `VeraGuard` (decodes transactions, scores recipients, enforces policy, sends only if allowed), `Vera` client, pure `evaluatePolicy`, CLI `npx veraagent` | `npm run build` · `npm test` (21 e2e and security tests on mainnet, read-only) · `npm publish` |
| `python/` | Python package `veralayer`: same policy engine, pinned-key verification | `python -m build` · `python tests/test_e2e.py` · `python tests/test_security.py` |
| `social/` | X kit: `POSTS.md`, `ARTICLE.md` and images rendered from the real product | `node render.mjs` (site running on :3211) |
| `agent-kit-plugin/` | Superseded by `veralayer/agent-kit` (0.2.0) | — |

## How a check works

1. **Collect (deterministic).**
   - Via Helius: account info and balance, up to 3,000 signatures (for age and activity), and the 100 most recent transactions parsed in detail.
   - The 100-transaction parse runs as 4 parallel requests.
   - Output is a set of features:
     - counterparties, and how many recur;
     - known vs unverified programs;
     - failed-transaction ratio;
     - the drain pattern;
     - token creations;
     - matches against the flagged list (`site/lib/engine/flagged.json`, plus the optional `VERA_FLAGGED_URL` feed), both for the address itself and its counterparties;
     - the funding source: who sent the wallet its first SOL, and whether that address is flagged or brand-new.
   - Programs and token accounts are not scored: they are marked as unknown, with the reason.
2. **Score (deterministic).** `score.ts` turns the features into a 0–100 base score, a tier, and template reasons.
   - Tiers: high ≥ 75, medium ≥ 45, low below that; unknown if there are fewer than 3 transactions.
   - A flagged address is capped at 5.
3. **Refine (AI).** With `FAL_KEY` set (default: Claude Opus 5.5 through fal.ai `openrouter/router`), or `ANTHROPIC_API_KEY` as an alternative, Claude reads the features and the base score and returns a score and readable reasons as structured JSON. Guardrails:
   - the score can move at most ±15 points from the base;
   - every reason must cite a real feature key;
   - the tier is computed on the server;
   - a flagged address can never be raised.

   If the call fails, or the daily cap is reached (`VERA_AI_DAILY_CAP`, default 500 per instance), the deterministic result is used.
4. **Sign.**
   - The canonical (key-sorted) JSON of the attestation is signed with Vera's ed25519 key.
   - `id` = sha256 of that JSON.
   - The public key is published at `/.well-known/vera.json`.
   - Anyone can verify offline with the SDK.
5. **Anchor (optional).** With `VERA_ANCHOR=devnet|mainnet`, the engine sends a Memo transaction `vera:v1:<id>` signed by the same key.

## Vercel deploy

Production environment variables:
- `HELIUS_API_KEY`
- `FAL_KEY`
- `VERA_SIGNER_SECRET`: required, so every instance signs with the same key
- `VERA_ANON_PER_MIN=20`
- `VERA_AI_DAILY_CAP=500`

The site carries a copy of veraagent's `client.ts` and `policy.ts` in `lib/veraagent/`, so the browser simulator runs the same policy code. After changing `veraagent/src`, run `npm run sync-sdk`.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | |
| GET | `/.well-known/vera.json` | Issuer public key |
| POST | `/v1/check/batch` | Body `{ addresses }`, up to 10 |
| POST | `/v1/check` | Body `{ address, fresh? }`; returns `{ id, attestation, signature, summary, anchor, features }` |
| GET | `/v1/check/:address` | |
| GET | `/v1/attestations/:id` | |
| POST | `/v1/verify` | Body `{ attestation, signature }` |

- **Rate limit:** anonymous callers get 10 requests per minute per IP. An `x-api-key` header from `VERA_API_KEYS` skips the limit.
- **Cache:** results are cached for 10 minutes per address.

## MCP

Configure the server like this:

```json
{ "mcpServers": { "vera": { "command": "npm", "args": ["--prefix", "<path>/engine", "run", "-s", "mcp"], "env": { "VERA_API_URL": "https://api…" } } } }
```

- It exposes one tool: `vera_check(address)`.
- Without `VERA_API_URL`, it runs the engine locally and needs `HELIUS_API_KEY`.

## Known limits (MVP)

- **Age is a lower bound** for very active wallets: we read at most 3,000 signatures.
- **Small flagged list:** `site/lib/engine/flagged.json` holds 12 seed addresses, plus the optional `VERA_FLAGGED_URL` feed. Only one hop is checked.
- **Coarse program list:** the "known programs" allowlist (`site/lib/engine/programs.ts`) is popularity-based. It is not an audit.
- **No database yet:** on Vercel, `/v1/attestations/:id` only works on the instance that issued the attestation. Every attestation verifies on its own, so clients should keep the signed copy. A shared store (Vercel KV / Postgres) is the next step.
- **Soft rate limit:** in serverless the anonymous limit is counted per instance.
- **Latency:** 4–15 s for an uncached check on busy wallets.
