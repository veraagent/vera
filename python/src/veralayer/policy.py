"""Spending policy: pure, no network. Same rules and finding codes as the JavaScript package (planned payments only)."""
from __future__ import annotations

import math
from typing import Iterable, Optional

RANK = {"unknown": 0, "low": 1, "medium": 2, "high": 3}
ACTIONS = ("allow", "review", "block")
INF = float("inf")

DEFAULT_POLICY = {
    "min_tier": "medium",
    # unknown recipients are governed by on_unknown unless you set a cap for "unknown" here
    "tier_limits_sol": {"high": INF, "medium": 5, "low": 0},
    "max_sol_per_tx": None,
    "daily_limit_sol": None,
    "token_limits": None,
    "allow": [],
    "deny": [],
    "on_unknown": "review",
    "on_check_error": "block",
}


def _worst(a: str, b: str) -> str:
    if "block" in (a, b):
        return "block"
    if "review" in (a, b):
        return "review"
    return "allow"


def _fmt(n: float) -> str:
    return str(int(n)) if float(n).is_integer() else f"{n:.4f}".rstrip("0")


def _short(a: str) -> str:
    return f"{a[:4]}…{a[-4:]}"


def _num_ok(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and not math.isnan(v) and v >= 0


def validate_policy(policy: Optional[dict]) -> None:
    """Raise ValueError on a policy that would silently weaken checks."""
    p = policy or {}
    if p.get("min_tier") is not None and p["min_tier"] not in ("high", "medium", "low"):
        raise ValueError(f"invalid min_tier: {p['min_tier']!r}")
    for k in ("on_unknown", "on_check_error"):
        if p.get(k) is not None and p[k] not in ACTIONS:
            raise ValueError(f"invalid {k}: {p[k]!r}")
    if p.get("on_check_error") == "allow":
        raise ValueError("on_check_error cannot be allow")
    for k in ("max_sol_per_tx", "daily_limit_sol"):
        if p.get(k) is not None and not _num_ok(p[k]):
            raise ValueError(f"invalid {k}: {p[k]!r}")
    for tier, v in (p.get("tier_limits_sol") or {}).items():
        if tier not in RANK:
            raise ValueError(f"invalid tier in tier_limits_sol: {tier!r}")
        if v is not None and not _num_ok(v):
            raise ValueError(f"invalid tier_limits_sol.{tier}: {v!r}")
    for mint, v in (p.get("token_limits") or {}).items():
        if not _num_ok(v):
            raise ValueError(f"invalid token_limits.{mint}: {v!r}")


def evaluate_policy(outflows: Iterable[dict], recipients: Iterable[dict], spent_today_sol: float = 0, policy: Optional[dict] = None) -> dict:
    """Decide allow / review / block.

    outflows:   [{"kind": "sol"|"token", "to": addr, "amount": float, "mint"?: str}]
    recipients: [{"address", "ok": True, "score", "tier", "reasons", "attestation_id", "verified", "expired"}]
                or [{"address", "ok": False, "error"}]
    """
    validate_policy(policy)
    p = {**DEFAULT_POLICY, **{k: v for k, v in (policy or {}).items() if v is not None}}
    p["tier_limits_sol"] = {**DEFAULT_POLICY["tier_limits_sol"], **{k: v for k, v in ((policy or {}).get("tier_limits_sol") or {}).items() if v is not None}}
    recipients = list(recipients)
    allow, deny = set(p["allow"]), set(p["deny"])
    findings: list = []

    def add(action: str, code: str, message: str, address: Optional[str] = None):
        findings.append({"action": action, "code": code, "message": message, **({"address": address} if address else {})})

    outflows = list(outflows)
    good = [o for o in outflows if _num_ok(o.get("amount")) and math.isfinite(o["amount"])]
    for o in outflows:
        if o not in good:
            add("block", "bad_amount", f"Invalid amount {o.get('amount')!r} to {_short(str(o.get('to', '')))}", o.get("to"))
    outflows = good

    total_sol = sum(o["amount"] for o in outflows if o["kind"] == "sol")
    sol_to: dict = {}
    for o in outflows:
        if o["kind"] == "sol":
            sol_to[o["to"]] = sol_to.get(o["to"], 0) + o["amount"]
    by_addr = {r["address"]: r for r in recipients}

    for to in dict.fromkeys(o["to"] for o in outflows):
        s = _short(to)
        if to in deny:
            add("block", "denylisted", f"{s} is on your deny list", to)
            continue
        if to in allow:
            continue
        r = by_addr.get(to)
        if not r or not r.get("ok"):
            add(p["on_check_error"], "check_failed", f"Could not check {s}" + (f": {r['error']}" if r else ""), to)
            continue
        tier = r.get("tier")
        if tier not in RANK:
            add(p["on_check_error"], "bad_tier", f"Vera returned an unexpected tier for {s}", to)
            continue
        if not r["verified"]:
            add(p["on_check_error"], "bad_signature", f"Vera's signature for {s} did not verify", to)
            continue
        if r.get("expired"):
            add("review", "stale_check", f"Vera's result for {s} has expired", to)
        if tier == "unknown":
            add(p["on_unknown"], "unknown_recipient", f"{s} has no history Vera can score", to)
        elif RANK[tier] < RANK[p["min_tier"]]:
            first = r["reasons"][0]["text"] if r.get("reasons") else ""
            add("block", "tier_below_minimum", f"{s} is {tier} trust ({r['score']}/100), below your minimum of {p['min_tier']}: {first}".strip(), to)
        cap = p["tier_limits_sol"].get(tier, INF)
        sent = sol_to.get(to, 0)
        if sent > cap:
            add("block" if cap == 0 else "review", "tier_limit", f"{_fmt(sent)} SOL to {s} exceeds the {_fmt(cap)} SOL limit for {tier} trust", to)

    limits = p.get("token_limits") or {}
    for o in outflows:
        if o["kind"] == "token" and o.get("mint") in limits and o["amount"] > limits[o["mint"]]:
            add("review", "token_limit", f"{_fmt(o['amount'])} of {o['mint'][:4]}… exceeds your {_fmt(limits[o['mint']])} per-transaction cap", o["to"])
    if p["max_sol_per_tx"] is not None and total_sol > p["max_sol_per_tx"]:
        add("block", "tx_limit", f"{_fmt(total_sol)} SOL in one transaction exceeds your {_fmt(p['max_sol_per_tx'])} SOL cap")
    if p["daily_limit_sol"] is not None and spent_today_sol + total_sol > p["daily_limit_sol"]:
        add("block", "daily_limit", f"This would bring today's spend to {_fmt(spent_today_sol + total_sol)} SOL, over your {_fmt(p['daily_limit_sol'])} SOL daily limit")

    action = "allow"
    for f in findings:
        action = _worst(action, f["action"])
    return {"action": action, "findings": findings, "outflows": outflows, "recipients": recipients, "total_sol": total_sol}
