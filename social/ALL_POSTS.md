# @veraagentio — все посты в очереди (после проверки агентами)

Тексты ровно такие, как уйдут в X. Картинки в `social/images/`.


---

## 1. 3 ноября · 16:00 МСК · картинка `01-launch.png`

```
Your agent signs. Vera checks first.

veralayer is a payment guard for AI agents on Solana. It decodes each transaction, scores every recipient from on-chain history and applies your spending policy before signing.

npm install veralayer

veraagent.io
```


---

## 2. 3 ноября · 16:02 МСК (ответ под постом 1)

```
Drop-in for one call:

before: connection.sendTransaction(tx, [agent])
after:  guard.sendTransaction(tx, [agent])

A block throws with the finding codes. A review waits for your onReview handler. Neither reaches the network.

veraagent.io/docs
```


---

## 3. 3 ноября · 19:00 МСК · картинка `08-cli.png`

```
npx veralayer pay <address> <sol>, on mainnet data:

1 SOL to a medium-trust wallet (score 57): ALLOW
12 SOL to the same wallet: REVIEW, over the 5 SOL medium cap
1 SOL to a wallet in a tracked scam cluster: BLOCK

Each line prints the rule that fired.
```


---

## 4. 3 ноября · 22:00 МСК · картинка `04-signed.png`

```
Every Vera result is signed: ed25519 over key-sorted JSON.

veralayer verifies it against the issuer key pinned in the package. Edit one byte of the signed result, or replay another address's, and the payment is blocked.

Check one: https://veraagent.io/a/824fa9c73ef6f733bb398214a52b4a20637dc7f7b271259c1363f1efbb4c2ad4
```


---

## 5. 4 ноября · 16:00 МСК · картинка `02-decode.png`

```
Agents don't send payments, they sign transactions. So the guard decodes the tx:
· SOL transfers
· SPL + Token-2022, resolved to the owner wallet
· v0 lookup tables
· approve / setAuthority / closeAccount to someone else: blocked
· a swap it can't value: review
```


---

## 6. 4 ноября · 19:00 МСК · картинка `05-scoring.png`

```
How Vera scores a recipient:

1. Read: 3,000 signatures, the last 100 txs, the first funder
2. Score: deterministic 0–100 from on-chain features; listed addresses cap at 5
3. Explain: Claude may move it ±15, every reason cites a feature
4. Sign: ed25519
```


---

## 7. 4 ноября · 22:00 МСК · картинка `03-policy.png`

```
Spending rules are a plain object:

minTier: 'medium'
tierLimitsSol: { high: 50, medium: 5 }
dailyLimitSol: 20
tokenLimits: { [USDC]: 500 }

Every finding carries a code (daily_limit, tier_limit, bad_signature…) you can branch on. A bad value throws at startup.
```


---

## 8. 5 ноября · 16:00 МСК · картинка `09-fail-closed.png`

```
If Vera can't answer, nothing gets paid.

Defaults:
· API down, bad signature, or a result for the wrong address: block
· recipient with no on-chain history: review
· NaN or negative amount: block

The first two are policy options: onCheckError and onUnknown.
```


---

## 9. 5 ноября · 19:00 МСК · картинка `10-review.png`

```
Big payments wait for a human.

Over a tier cap, the decision is review and the payment waits on your handler:

onReview: (d) => askInTelegram(d.findings)
onDecision: (d) => auditLog.write(d)

onDecision receives every allow, review and block with the rule that fired.
```


---

## 10. 5 ноября · 22:00 МСК · картинка `06-mcp.png`

```
Give Claude a payment check. In claude_desktop_config.json, under mcpServers:

"vera": { "command": "npx", "args": ["-y", "veralayer", "mcp"] }

vera_check scores an address. vera_guard_payment runs your policy on a planned SOL payment. Any MCP client.
```


---

## 11. 6 ноября · 16:00 МСК · картинка `07-python.png`

```
veralayer in Python:

pip install veralayer

guard.authorize(to=recipient, amount_sol=1.5) raises before you send if the policy says no. Same rules and finding codes as JS for planned payments; signed results verify byte for byte across both.

One dependency: cryptography.
```
