"""VeraGuard: decide on a planned payment before your agent sends it."""
from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Callable, Optional

from .client import Vera
from .policy import evaluate_policy, validate_policy


class MemoryLedger:
    """Today's spend in one process. Pass your own object with spent_today()/add() for anything bigger."""

    def __init__(self):
        self._day, self._spent = date.today(), 0.0

    def _roll(self):
        if date.today() != self._day:
            self._day, self._spent = date.today(), 0.0

    def spent_today(self) -> float:
        self._roll()
        return self._spent

    def add(self, sol: float) -> None:
        self._roll()
        self._spent += sol


class VeraBlockedError(Exception):
    def __init__(self, decision: dict):
        super().__init__("Vera blocked this payment: " + "; ".join(f["message"] for f in decision["findings"] if f["action"] == "block"))
        self.decision = decision


class VeraReviewRequiredError(Exception):
    def __init__(self, decision: dict):
        super().__init__("Vera needs a human review: " + "; ".join(f["message"] for f in decision["findings"] if f["action"] == "review"))
        self.decision = decision


class VeraGuard:
    """
    >>> guard = VeraGuard(policy={"min_tier": "medium", "daily_limit_sol": 20})
    >>> d = guard.evaluate_payment(to=seller, amount_sol=1.5)
    >>> d["action"]   # 'allow' | 'review' | 'block'
    """

    def __init__(self, policy: Optional[dict] = None, vera: Optional[Vera] = None, ledger=None,
                 on_review: Optional[Callable[[dict], bool]] = None, on_decision: Optional[Callable[[dict], None]] = None):
        self.policy = policy or {}
        validate_policy(self.policy)  # fail at startup on typos, not silently at payment time
        self.vera = vera or Vera()
        self._lock = threading.Lock()
        self.ledger = ledger or MemoryLedger()
        self.on_review = on_review
        self.on_decision = on_decision

    def check_recipients(self, addresses) -> list:
        skip = set(self.policy.get("allow", [])) | set(self.policy.get("deny", []))
        uniq = [a for a in dict.fromkeys(addresses) if a not in skip]

        def one(address: str) -> dict:
            try:
                r = self.vera.check(address)
                v = self.vera.verify(r)
                a = r["attestation"]
                return {"address": address, "ok": True, "score": a["score"], "tier": a["tier"], "reasons": a["reasons"],
                        "attestation_id": r["id"], "verified": v["valid"], "expired": v["expired"]}
            except Exception as e:  # any failure becomes a check_failed finding
                return {"address": address, "ok": False, "error": str(e)}

        with ThreadPoolExecutor(max_workers=min(8, max(1, len(uniq)))) as pool:
            return list(pool.map(one, uniq))

    def evaluate_payment(self, to: str, amount_sol: float = 0, token: Optional[dict] = None) -> dict:
        """Decide on a planned SOL payment, or a token payment with token={"mint", "amount"}."""
        outflow = {"kind": "token", "to": to, "amount": token["amount"], "mint": token["mint"]} if token else {"kind": "sol", "to": to, "amount": amount_sol}
        return self.evaluate_outflows([outflow])

    def evaluate_outflows(self, outflows: list) -> dict:
        decision = evaluate_policy(outflows, self.check_recipients(o["to"] for o in outflows), self.ledger.spent_today(), self.policy)
        if self.on_decision:
            self.on_decision(decision)
        return decision

    def authorize(self, to: str, amount_sol: float) -> dict:
        """Raise unless the payment may go ahead; records the spend when it may. Call right before you send."""
        # evaluate + record under a lock, so two threads can't both pass a daily limit
        with self._lock:
            d = self.evaluate_payment(to, amount_sol)
            if d["action"] == "block":
                raise VeraBlockedError(d)
            if d["action"] == "review" and not (self.on_review and self.on_review(d)):
                raise VeraReviewRequiredError(d)
            self.ledger.add(d["total_sol"])
            return d

    def release(self, decision: dict) -> None:
        """Give back the spend recorded by authorize() when the payment was not sent after all."""
        self.ledger.add(-decision["total_sol"])
