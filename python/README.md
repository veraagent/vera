# veralayer (Python)

[![npm](https://img.shields.io/npm/v/veralayer)](https://www.npmjs.com/package/veralayer) [![PyPI](https://img.shields.io/pypi/v/veralayer)](https://pypi.org/project/veralayer/) [![license](https://img.shields.io/badge/license-MIT-black)](https://github.com/veraagent/vera/blob/main/veraagent/LICENSE)

A payment guard for AI agents on Solana. Before your agent pays, veralayer does three things:

- **Scores the recipient** with [Vera](https://veraagent.io), using the address's on-chain history.
- **Verifies the signature** on that result locally.
- **Applies your spending policy** and returns `allow`, `review` or `block`.

```bash
pip install veralayer
```

## Guard a payment

```python
from veralayer import VeraGuard, VeraBlockedError, VeraReviewRequiredError

guard = VeraGuard(policy={
    "min_tier": "medium",
    "tier_limits_sol": {"high": 50, "medium": 5},
    "daily_limit_sol": 20,
})

try:
    guard.authorize(to=recipient, amount_sol=1.5)   # raises unless allowed; records the spend
    send_sol(recipient, 1.5)                        # your existing code
except (VeraBlockedError, VeraReviewRequiredError) as e:
    print(e.decision["findings"])
```

To decide without recording anything, call `guard.evaluate_payment(to, amount_sol)`. It returns `{"action", "findings", ...}`.

## Score an address

```python
from veralayer import Vera

vera = Vera()
r = vera.check("AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51")
r["attestation"]["score"], r["attestation"]["tier"]
vera.verify(r)   # {'valid': True, 'expired': False}, checked offline
```

## CLI

```bash
veralayer check <address>
veralayer pay <address> 2.5 --min-tier medium --daily 20
```

## Policy

The policy fields, defaults and finding codes are the same as in the JavaScript package, with the field names in snake_case. The policy engine is pure, so you can call `evaluate_policy(outflows, recipients, spent_today_sol, policy)` directly.

| Field | Default |
|---|---|
| `min_tier` | `"medium"` |
| `tier_limits_sol` | `{"high": inf, "medium": 5, "low": 0}` |
| `max_sol_per_tx` | none |
| `daily_limit_sol` | none |
| `token_limits` | none |
| `allow` | `[]` |
| `deny` | `[]` |
| `on_unknown` | `"review"` |
| `on_check_error` | `"block"` |

## Trust

Results must be signed by Vera's production key, `VERA_ISSUER`, which is pinned in the package. A result for a different address than the one requested is rejected. NaN or negative amounts block. A policy with a typo raises `ValueError`. `authorize` is thread-safe, and `release(decision)` gives back the amount if the send fails.

## Differences from the JavaScript package

- **No transaction decoding (yet).** Python agents usually build payments themselves, so the guard works on planned payments: `authorize`, `evaluate_payment` and `evaluate_outflows`.
- **One dependency:** `cryptography`, used for ed25519.

Docs: https://veraagent.io/docs · MIT · by [VeraLayer](https://veralayer.io)
