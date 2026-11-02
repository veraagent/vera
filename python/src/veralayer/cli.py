"""veralayer check <address> | veralayer pay <address> <sol> [--min-tier T] [--daily SOL] [--max-tx SOL] [--json]"""
from __future__ import annotations

import argparse
import json
import sys

from .client import Vera
from .guard import VeraGuard


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="veralayer", description="Payment guard for AI agents on Solana")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check", help="score an address")
    c.add_argument("address")
    p = sub.add_parser("pay", help="decide on a planned SOL payment")
    p.add_argument("address")
    p.add_argument("sol", type=float)
    p.add_argument("--min-tier", choices=["high", "medium", "low"])
    p.add_argument("--daily", type=float)
    p.add_argument("--max-tx", type=float)
    for x in (c, p):
        x.add_argument("--json", action="store_true")
        x.add_argument("--api")
    args = ap.parse_args(argv)
    vera = Vera(api_url=args.api)

    try:
        if args.cmd == "check":
            r = vera.check(args.address)
            v = vera.verify(r)
            if args.json:
                print(json.dumps({**r, "verified": v}, indent=2, ensure_ascii=False))
                return 0
            a = r["attestation"]
            print(f"\n{a['score'] if a['score'] is not None else '—'}/100 {a['tier'].upper()}  {a['subject']}")
            if r.get("summary"):
                print(r["summary"])
            for x in a["reasons"]:
                print(f"  {dict(ok='✓', warn='!', bad='×').get(x['kind'], 'i')} {x['text']}")
            print(f"\nsignature {'verified' if v['valid'] else 'INVALID'} · {a['method']} · expires {a['expires_at']}")
            return 0

        policy = {k: v for k, v in {"min_tier": args.min_tier, "daily_limit_sol": args.daily, "max_sol_per_tx": args.max_tx}.items() if v is not None}
        d = VeraGuard(policy=policy, vera=vera).evaluate_payment(args.address, args.sol)
        if args.json:
            print(json.dumps(d, indent=2, ensure_ascii=False, default=str))
            return 0
        print(f"\n{d['action'].upper()}  {args.sol} SOL to {args.address}")
        for r in d["recipients"]:
            print(f"  {r['tier'].upper()} {r['score']} {r['address']} signature {'✓' if r['verified'] else '✗'}" if r["ok"] else f"  × {r['address']}: {r['error']}")
        for f in d["findings"] or [{"action": "", "message": "no policy findings"}]:
            print(f"  {f['action']}  {f['message']}")
        return 0
    except Exception as e:
        print(f"error {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
