# Vera: dev-voice posts

These are first-person posts from the team's personal accounts. They tag **@veraagentio**. Everything is lowercase, with no emoji and no dashes.

Each post fits in 280 characters, so they work without Premium. Images are in `social/images/`.

> **Check the hook before publishing.** The Freysa hook is a public, widely reported event. On 29 Nov 2024 a user convinced the Freysa agent that `approveTransfer` handled *incoming* money, and the agent sent its whole prize pool (~13.19 ETH, ~$47k).

---

## Kas Vegas (CEO), thread · image `08-cli.png` on tweet 3 · reviewed, final copy in `social/kas/`

**1/**
```
1/ two years ago this month someone talked an ai agent called freysa into sending its whole prize pool, about $47k. no hack. they convinced it that its transfer function was for receiving money.

the agent never checked what it was signing.
```

**2/**
```
2/ now imagine that agent running your treasury, paying other agents for data, compute and trades. thousands of payments a day and nobody reading any of them.
```

**3/**
```
3/ so we built vera.

before your agent signs, it decodes the transaction, scores every recipient from their onchain history, and applies your spending rules. a payment that breaks them never reaches the network.

npm install veralayer
```

**4/**
```
4/ every score comes back signed, so anyone can verify it, and every block tells you which rule fired.

your agent signs. vera checks first.

veraagent.io @veraagentio
```

---

## Aaron Uyehara (CTPO), thread · image `02-decode.png` on tweet 2

**1/**
```
1/ the scariest thing about agent payments isn't the model. it's that "pay 500 usdc to 9fqe…" can mean paying a token account, and the money goes to whoever owns it.
```

**2/**
```
2/ so i made the guard read the transaction itself. it follows every transfer to the wallet that actually receives it, even a token account created in the same transaction, and flags approve and closeaccount before they're signed.
```

**3/**
```
3/ then each recipient gets a score from onchain history. claude can move it 15 points at most and every reason has to cite a real feature. the result is signed and verified inside the library.

rules first, model second.
```

**4/**
```
4/ it fails closed. api down, bad signature, or a result for the wrong address: the payment is blocked.

js and python, mcp for claude and cursor.

veraagent.io @veraagentio
```

---

## Single posts (no thread)

**Kas**
```
an ai agent with a wallet will sign whatever it's talked into. we built the thing that reads the transaction first.

npm install veralayer

veraagent.io @veraagentio
```

**Aaron**
```
shipped veralayer 0.2.0: an mcp server, so claude and cursor can check a payment before making it.

"vera": { "command": "npx", "args": ["-y", "veralayer", "mcp"] }

veraagent.io @veraagentio
```
