"""Vera API client: score an address and verify the signed result locally against Vera's pinned key."""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

DEFAULT_API = "https://veraagent.io"
# Vera's production signing key. Results signed by anything else are rejected unless you pass your own issuer.
VERA_ISSUER = "4VyCQLEb8eVmPYXDUwYkEpCMhXFBRshUiKHHuKTfPDFQ"
TIERS = ("high", "medium", "low", "unknown")
TIER_RANK = {"unknown": 0, "low": 1, "medium": 2, "high": 3}

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_SURROGATE = re.compile("[\ud800-\udfff]")


def b58decode(s: str) -> bytes:
    n = 0
    for ch in s:
        i = _B58.find(ch)
        if i < 0:
            raise ValueError("invalid base58")
        n = n * 58 + i
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big") if n else b""
    pad = len(s) - len(s.lstrip("1"))
    return b"\x00" * pad + raw


def _js_number(x: float) -> str:
    """Format a float exactly like JavaScript's Number#toString (used by JSON.stringify)."""
    if x != x or x in (float("inf"), float("-inf")):
        return "null"
    if x == 0:
        return "0"
    sign, digits, exp = Decimal(repr(x)).normalize().as_tuple()
    d = "".join(map(str, digits))
    k, n = len(d), len(d) + exp  # value = 0.d * 10^n
    s = "-" if sign else ""
    if k <= n <= 21:
        return s + d + "0" * (n - k)
    if 0 < n <= 21:
        return s + d[:n] + "." + d[n:]
    if -6 < n <= 0:
        return s + "0." + "0" * (-n) + d
    e = n - 1
    return s + d[0] + ("." + d[1:] if k > 1 else "") + "e" + ("+" if e > 0 else "-") + str(abs(e))


def _js_str(s: str) -> str:
    """JSON.stringify for strings: raw unicode, lone surrogates escaped the way JavaScript does."""
    return _SURROGATE.sub(lambda m: "\\u%04x" % ord(m.group()), json.dumps(s, ensure_ascii=False))


def canonical(value: Any) -> str:
    """Key-sorted compact JSON; must match the engine (JavaScript) byte for byte."""
    if isinstance(value, dict):
        # JavaScript sorts object keys by UTF-16 code unit
        return "{" + ",".join(_js_str(k) + ":" + canonical(value[k]) for k in sorted(value, key=lambda k: k.encode("utf-16-be", "surrogatepass"))) + "}"
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical(v) for v in value) + "]"
    if isinstance(value, bool) or value is None:
        return json.dumps(value)
    if isinstance(value, str):
        return _js_str(value)
    if isinstance(value, int):
        return str(value) if abs(value) < 10**21 else _js_number(float(value))
    if isinstance(value, float):
        return _js_number(value)
    raise TypeError(f"cannot canonicalize {type(value).__name__}")


class VeraError(Exception):
    def __init__(self, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.status = status


def verify_attestation(attestation: dict, signature: str, trusted_issuer: Optional[str] = None) -> dict:
    """Verify a signed Vera result offline. Returns {valid, expired, reason?}; never raises."""
    try:
        expires = datetime.fromisoformat(str(attestation["expires_at"]).replace("Z", "+00:00"))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        expired = expires < datetime.now(timezone.utc)
    except Exception:
        expired = True  # an unparseable date counts as expired
    try:
        if trusted_issuer and attestation.get("issuer") != trusted_issuer:
            return {"valid": False, "expired": expired, "reason": "issuer is not the trusted Vera key"}
        if attestation.get("tier") not in TIERS:
            return {"valid": False, "expired": expired, "reason": f"unexpected tier {attestation.get('tier')!r}"}
        key = Ed25519PublicKey.from_public_bytes(b58decode(attestation["issuer"]))
        key.verify(b58decode(signature), canonical(attestation).encode("utf-8", "surrogatepass"))
        return {"valid": True, "expired": expired}
    except InvalidSignature:
        return {"valid": False, "expired": expired, "reason": "signature does not match"}
    except Exception:
        return {"valid": False, "expired": expired, "reason": "malformed signature or attestation"}


class Vera:
    """Client for the Vera API.

    >>> vera = Vera()
    >>> r = vera.check("AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51")
    >>> r["attestation"]["tier"], vera.verify(r)["valid"]

    issuer: the key results must be signed with. Default: Vera's production key (VERA_ISSUER).
            Pass your own for a self-hosted Vera, or "fetch" to trust /.well-known/vera.json on api_url.
    """

    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None, issuer: Optional[str] = None, timeout: float = 30):
        self.api_url = (api_url or os.environ.get("VERA_API_URL") or DEFAULT_API).rstrip("/")
        self.api_key = api_key or os.environ.get("VERA_API_KEY")
        issuer = issuer or os.environ.get("VERA_ISSUER") or VERA_ISSUER
        self.issuer = None if issuer == "fetch" else issuer
        self.timeout = timeout

    def _req(self, path: str, body: Optional[dict] = None) -> dict:
        headers = {"content-type": "application/json", "user-agent": "veralayer-python/0.1"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.api_url + path, data=data, headers=headers, method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read()).get("error")
            except Exception:
                msg = None
            raise VeraError(msg or f"Vera API error {e.code}", e.code) from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise VeraError(f"Vera API unreachable: {getattr(e, 'reason', e)}") from None

    def check(self, address: str, fresh: bool = False) -> dict:
        """Score a counterparty: {id, attestation: {score, tier, reasons, ...}, signature, summary}. Raises if the result is for another address."""
        r = self._req("/v1/check", {"address": address, "fresh": fresh})
        if (r.get("attestation") or {}).get("subject") != address:
            raise VeraError("Vera returned a result for a different address")
        return r

    def get_issuer(self) -> str:
        if not self.issuer:
            self.issuer = self._req("/.well-known/vera.json")["issuer"]
        return self.issuer

    def verify(self, result: dict) -> dict:
        return verify_attestation(result["attestation"], result["signature"], self.get_issuer())

    def require(self, address: str, min_tier: str = "medium") -> dict:
        """Raise VeraError unless the result verifies, has not expired and meets min_tier."""
        if min_tier not in ("high", "medium", "low"):
            raise VeraError(f"invalid min_tier: {min_tier}")
        r = self.check(address)
        v = self.verify(r)
        if not v["valid"]:
            raise VeraError(f"attestation invalid: {v.get('reason')}")
        if v["expired"]:
            raise VeraError("attestation expired")
        a = r["attestation"]
        if TIER_RANK[a["tier"]] < TIER_RANK[min_tier]:
            first = a["reasons"][0]["text"] if a["reasons"] else ""
            raise VeraError(f"counterparty tier {a['tier']} is below {min_tier}: {first}")
        return r
