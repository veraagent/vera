"""End-to-end tests against a live Vera API (read-only). Run: python tests/test_e2e.py  (VERA_API_URL to override)."""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from veralayer import MemoryLedger, Vera, VeraBlockedError, VeraGuard, evaluate_policy, verify_attestation  # noqa: E402

FLAGGED = "293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy"
TRADER = "AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51"
passed = failed = 0


def t(name):
    def wrap(fn):
        global passed, failed
        s = time.time()
        try:
            fn()
            passed += 1
            print(f"  ✓ {name} ({time.time() - s:.1f}s)")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  ✗ {name}\n    {type(e).__name__}: {e}")
        return fn
    return wrap


print("veralayer (python) tests\n")


@t("policy: pure evaluation")
def _():
    d = evaluate_policy([{"kind": "sol", "to": "A" * 32, "amount": 6}],
                        [{"address": "A" * 32, "ok": True, "score": 60, "tier": "medium", "reasons": [], "attestation_id": "i", "verified": True, "expired": False}])
    assert d["action"] == "review" and d["findings"][0]["code"] == "tier_limit"


@t("check + local signature verification")
def _():
    vera = Vera()
    r = vera.check(TRADER)
    assert vera.verify(r)["valid"]
    bad = {**r["attestation"], "score": 99}
    assert not verify_attestation(bad, r["signature"])["valid"]


@t("flagged recipient is blocked")
def _():
    d = VeraGuard().evaluate_payment(FLAGGED, 0.5)
    assert d["action"] == "block" and any(f["code"] == "tier_below_minimum" for f in d["findings"])


@t("tier limit: medium recipient, 12 SOL needs review")
def _():
    d = VeraGuard().evaluate_payment(TRADER, 12)
    tier = d["recipients"][0]["tier"]
    if tier == "medium":
        assert d["action"] == "review"


@t("authorize raises on block and records spend on allow")
def _():
    g = VeraGuard(policy={"allow": [TRADER]}, ledger=MemoryLedger())
    try:
        g.authorize(FLAGGED, 1)
        raise AssertionError("should have raised")
    except VeraBlockedError:
        pass
    g.authorize(TRADER, 2)
    assert g.ledger.spent_today() == 2


@t("daily limit")
def _():
    led = MemoryLedger()
    led.add(19)
    d = VeraGuard(policy={"daily_limit_sol": 20, "allow": [TRADER]}, ledger=led).evaluate_payment(TRADER, 2)
    assert d["action"] == "block" and d["findings"][0]["code"] == "daily_limit"


@t("forged result is blocked")
def _():
    class Tampered(Vera):
        def check(self, address, fresh=False):
            r = super().check(address, fresh)
            return {**r, "attestation": {**r["attestation"], "tier": "high", "score": 99}}
    d = VeraGuard(vera=Tampered()).evaluate_payment(FLAGGED, 0.1)
    assert d["action"] == "block" and d["findings"][0]["code"] == "bad_signature"


print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
