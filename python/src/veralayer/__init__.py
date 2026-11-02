"""veralayer: payment guard for AI agents on Solana.

    from veralayer import VeraGuard
    guard = VeraGuard(policy={"min_tier": "medium", "daily_limit_sol": 20})
    guard.authorize(to=recipient, amount_sol=1.5)   # raises VeraBlockedError if the policy says no
"""
from .client import VERA_ISSUER, Vera, VeraError, canonical, verify_attestation
from .guard import MemoryLedger, VeraBlockedError, VeraGuard, VeraReviewRequiredError
from .policy import DEFAULT_POLICY, evaluate_policy, validate_policy

try:
    from importlib.metadata import version as _v
    __version__ = _v("veralayer")
except Exception:  # running from source
    __version__ = "0.1.0"
__all__ = [
    "Vera", "VeraError", "VERA_ISSUER", "verify_attestation", "canonical",
    "VeraGuard", "MemoryLedger", "VeraBlockedError", "VeraReviewRequiredError",
    "evaluate_policy", "validate_policy", "DEFAULT_POLICY",
]
