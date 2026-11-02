import Link from 'next/link';

export const metadata = { title: 'Changelog' };

const RELEASES = [
  {
    v: '0.2.0', date: 'November 2026', items: [
      'Security: Vera’s signing key is pinned in the package; results for a different address than requested are rejected; NaN, negative and infinite amounts block; policy typos throw at startup.',
      'Security: risky instructions (token approve, setAuthority, closeAccount to someone else, system assign) are blocked by default; only value leaving the guarded wallet counts, with a `wallet` option for relayers.',
      'Security: daily limits are reserved before sending and concurrent sends are serialised.',
      'Well-known DeFi programs that move value the guard can’t decode now go to review (`knownPrograms`).',
      'MCP server: `npx -y veralayer mcp` gives Claude Desktop, Cursor and Claude Code the vera_check and vera_guard_payment tools.',
      'Solana Agent Kit plugin is now part of the package: `veralayer/agent-kit`.',
      'API moves to `veraagent.io`. Public result pages at `/a/<id>`.',
    ],
  },
  {
    v: 'Python 0.1.0', date: 'November 2026', items: [
      '`pip install veralayer`: the same policy engine, pinned-key signature checks and finding codes, for planned payments.',
    ],
  },
  {
    v: '0.1.0', date: 'November 2026', items: [
      'VeraGuard: decodes SOL, SPL and Token-2022 transfers (token accounts resolved to owners, v0 lookup tables), scores each recipient, verifies Vera’s signature locally and applies a spending policy.',
      'Policy: minimum tier, per-tier SOL limits, per-transaction and daily caps, token caps, allow and deny lists.',
      'CLI: check, pay, inspect.',
      'Scoring engine: on-chain features, deterministic score, Claude Opus 5.5 explanations within ±15 points, ed25519-signed results.',
    ],
  },
];

const ROADMAP = [
  ['Next', 'Durable result pages and live counters, backed by a shared store.'],
  ['Planned', 'On-chain anchoring of result hashes, so a result can be proven to exist at a point in time.'],
  ['Planned', 'Decoding value inside swaps and other CPIs, not only direct transfers.'],
  ['Planned', 'Self-serve API keys and usage dashboard.'],
];

const fmt = (s: string) => s.split('`').map((p, i) => (i % 2 ? <code key={i}>{p}</code> : p));

export default function Page() {
  return (
    <>
      <main className="docs mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1>Changelog</h1>
        {RELEASES.map((r) => (
          <section key={r.v}>
            <h2>{r.v} <span className="ml-2 align-middle font-sans text-sm text-stone-500">{r.date}</span></h2>
            <ul>{r.items.map((i) => <li key={i}>{fmt(i)}</li>)}</ul>
          </section>
        ))}
        <h2>Roadmap</h2>
        <div className="table-wrap"><table><tbody>
          {ROADMAP.map(([s, t]) => <tr key={t}><td className="w-24 text-[10px] font-bold tracking-[0.2em] uppercase">{s}</td><td>{t}</td></tr>)}
        </tbody></table></div>
      </main>
    </>
  );
}
