"""Security regression tests (parity with the JS package). Run: python tests/test_security.py"""
import math
import os
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from veralayer import MemoryLedger, Vera, VeraError, VeraGuard, canonical, evaluate_policy, verify_attestation  # noqa: E402

FLAGGED = "293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy"
TRADER = "AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51"
passed = failed = 0


def t(name):
    def wrap(fn):
        global passed, failed
        try:
            fn()
            passed += 1
            print(f"  ✓ {name}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  ✗ {name}\n    {type(e).__name__}: {e}")
        return fn
    return wrap


def R(tier):
    return {"address": "A" * 32, "ok": True, "score": None if tier == "unknown" else 90, "tier": tier, "reasons": [], "attestation_id": "i", "verified": True, "expired": False}


print("veralayer (python) security tests\n")


@t("a result for a different address is rejected")
def _():
    class Mirror(Vera):
        def _req(self, path, body=None):
            return super()._req(path, {**body, "address": TRADER} if body else body)
    try:
        Mirror().check(FLAGGED)
        raise AssertionError("should raise")
    except VeraError as e:
        assert "different address" in str(e)
    d = VeraGuard(vera=Mirror()).evaluate_payment(FLAGGED, 0.1)
    assert d["action"] == "block" and d["findings"][0]["code"] == "check_failed"


@t("the issuer key is pinned by default")
def _():
    r = Vera().check(TRADER)
    forged = {**r["attestation"], "issuer": "11111111111111111111111111111111"}
    v = Vera().verify({"attestation": forged, "signature": r["signature"]})
    assert not v["valid"] and "trusted" in v["reason"]


@t("NaN, negative and infinite amounts block")
def _():
    for amount in (math.nan, -5, math.inf):
        d = evaluate_policy([{"kind": "sol", "to": "A" * 32, "amount": amount}], [R("high")], policy={"daily_limit_sol": 1})
        assert d["action"] == "block" and d["findings"][0]["code"] == "bad_amount", amount


@t("policy typos raise instead of weakening checks")
def _():
    for bad in ({"min_tier": "hgh"}, {"daily_limit_sol": "abc"}, {"on_check_error": "allow"}, {"tier_limits_sol": {"critical": 1}}):
        try:
            VeraGuard(policy=bad)
            raise AssertionError(f"accepted {bad}")
        except ValueError:
            pass


@t("None caps fall back to defaults, unexpected tier blocks")
def _():
    d = evaluate_policy([{"kind": "sol", "to": "A" * 32, "amount": 100}], [R("high")], policy={"tier_limits_sol": {"high": None}})
    assert d["action"] == "allow"
    d = evaluate_policy([{"kind": "sol", "to": "A" * 32, "amount": 1}], [R("critical")])
    assert d["action"] == "block" and d["findings"][0]["code"] == "bad_tier"


@t("unknown recipients default to review")
def _():
    d = evaluate_policy([{"kind": "sol", "to": "A" * 32, "amount": 1}], [R("unknown")])
    assert d["action"] == "review" and d["findings"][0]["code"] == "unknown_recipient"


@t("verify_attestation never raises on junk")
def _():
    for junk in ({}, {"issuer": None, "expires_at": "nope", "tier": "high"}, {"tier": "high", "issuer": "x", "expires_at": "2030-01-01T00:00:00", "s": "\ud800"}):
        v = verify_attestation(junk, "1111")
        assert v["valid"] is False


@t("canonical escapes lone surrogates like JavaScript")
def _():
    assert canonical({"a": "\ud800"}) == '{"a":"\\ud800"}'


@t("concurrent authorize cannot both pass a daily limit")
def _():
    g = VeraGuard(policy={"allow": [TRADER], "daily_limit_sol": 10}, ledger=MemoryLedger())
    ok = []

    def go():
        try:
            g.authorize(TRADER, 6)
            ok.append(1)
        except Exception:
            pass
    ts = [threading.Thread(target=go) for _ in range(2)]
    [x.start() for x in ts]
    [x.join() for x in ts]
    assert len(ok) == 1, ok


print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
