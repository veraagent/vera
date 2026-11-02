'use client';
import { useEffect, useMemo, useState } from 'react';
import { Vera, type CheckResult } from '@/lib/veraagent/client';
import { evaluatePolicy, type Policy, type RecipientCheck } from '@/lib/veraagent/policy';
import sample from '@/lib/sample-check.json';

// The guard's decision is computed in the browser with the same policy code that ships in the `veralayer` package.
// Only the recipient score comes from the API (signed, and verified here before the policy uses it).
const vera = new Vera({ apiUrl: process.env.NEXT_PUBLIC_VERA_API ?? '' });

const PRESETS = [
  { label: 'Busy trader', address: 'AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51' },
  { label: 'Flagged wallet', address: '293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy' },
  { label: 'Failing bot', address: '4Vi2EVAByXw1KR6mvZjj9Z8ymCHfYUjYT7rPdCyR1uqS' },
];
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const TIER_TEXT: Record<string, string> = { high: 'text-high', medium: 'text-medium', low: 'text-low', unknown: 'text-unknown' };
const ACTION = {
  allow: { word: 'Allowed.', cls: 'text-high', note: 'The guard signs and sends.' },
  review: { word: 'Needs review.', cls: 'text-medium', note: 'Held until onReview approves it.' },
  block: { word: 'Blocked.', cls: 'text-low', note: 'Never signed, never sent.' },
} as const;
const GLYPH: Record<string, string> = { ok: 'bg-high', warn: 'bg-medium', bad: 'bg-low', info: 'bg-unknown' };

async function toCheck(r: CheckResult): Promise<RecipientCheck> {
  const v = await vera.verify(r);
  const a = r.attestation;
  return { address: a.subject, ok: true, score: a.score, tier: a.tier, reasons: a.reasons, attestationId: r.id, verified: v.valid, expired: v.expired };
}

export default function Simulator({ linkResults = false }: { linkResults?: boolean }) {
  const [to, setTo] = useState(PRESETS[0].address);
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState(1);
  const [minTier, setMinTier] = useState<'high' | 'medium' | 'low'>('medium');
  const [mediumCap, setMediumCap] = useState(5);
  const [daily, setDaily] = useState(20);
  const [spent, setSpent] = useState(4);
  const [checks, setChecks] = useState<Record<string, RecipientCheck>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // the busy-trader result ships with the page (a real signed response), so the first decision needs no request;
  // it is still verified against Vera's key here like any other
  // once that bundled result expires, fetch a fresh one instead of showing a stale decision
  useEffect(() => {
    toCheck(sample as unknown as CheckResult).then((c) => {
      if (c.ok && c.expired) return load(c.address);
      setChecks((m) => ({ ...m, [c.address]: c }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(address: string) {
    setTo(address);
    if (checks[address]) return;
    setBusy(address);
    try {
      const c = await toCheck(await vera.check(address));
      setChecks((m) => ({ ...m, [address]: c }));
    } catch (e) {
      setChecks((m) => ({ ...m, [address]: { address, ok: false, error: (e as Error).message } }));
    } finally { setBusy(null); }
  }

  const policy: Policy = { minTier, tierLimitsSol: { medium: mediumCap }, dailyLimitSol: daily };
  const check = checks[to];
  const decision = useMemo(() => check && evaluatePolicy({
    outflows: [{ kind: 'sol', to, toAccount: to, amount, instruction: 'system.transfer' }],
    recipients: [check], spentTodaySol: spent, policy,
  }), [check, to, amount, spent, minTier, mediumCap, daily]); // eslint-disable-line react-hooks/exhaustive-deps


  const field = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-brick focus:outline-none';
  const label = 'text-[11px] font-bold tracking-[0.18em] text-stone-600 uppercase';

  // a number input with its unit inside the field
  const num = (id: string, value: number, set: (n: number) => void, unit = 'SOL', step = 1) => (
    <div className="relative mt-1.5">
      <input id={id} type="number" min={0} step={step} value={value} onChange={(e) => set(Math.max(0, Number(e.target.value)))} className={`${field} pr-12 font-mono`} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-stone-500">{unit}</span>
    </div>
  );
  const lab = 'block text-sm text-stone-600';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      {/* inputs */}
      <div className="card p-6 sm:p-8">
        <p className={label}>The agent wants to pay</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.address} type="button" onClick={() => load(p.address)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${to === p.address ? 'border-black bg-black text-white' : 'border-stone-200 text-stone-700 hover:border-stone-400'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8.5rem]">
          <form onSubmit={(e) => { e.preventDefault(); if (B58.test(custom.trim())) load(custom.trim()); }}>
            <label htmlFor="custom" className={lab}>Or any address</label>
            <div className="relative mt-1.5">
              <input id="custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Solana address" spellCheck={false} autoComplete="off" className={`${field} pr-16 font-mono`} />
              <button disabled={!B58.test(custom.trim()) || !!busy} className="absolute inset-y-1.5 right-1.5 rounded-lg bg-black px-3 text-xs font-semibold text-white disabled:bg-stone-200 disabled:text-stone-500">Use</button>
            </div>
          </form>
          <div>
            <label htmlFor="amt" className={lab}>Amount</label>
            {num('amt', amount, setAmount, 'SOL', 0.5)}
          </div>
        </div>

        <p className={`${label} mt-8 border-t border-stone-200 pt-6`}>Your policy</p>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          <div>
            <label htmlFor="tier" className={lab}>Minimum tier</label>
            <select id="tier" value={minTier} onChange={(e) => setMinTier(e.target.value as typeof minTier)} className={`${field} mt-1.5`}>
              <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </select>
          </div>
          <div>
            <label htmlFor="cap" className={lab}>Medium-tier cap</label>
            {num('cap', mediumCap, setMediumCap)}
          </div>
          <div>
            <label htmlFor="daily" className={lab}>Daily limit</label>
            {num('daily', daily, setDaily)}
          </div>
          <div>
            <label htmlFor="spent" className={lab}>Spent today</label>
            {num('spent', spent, setSpent)}
          </div>
        </div>
      </div>

      {/* decision */}
      <div className="flex">
        <div className="card flex-1 p-6 sm:p-8" aria-live="polite">
          <p className={label}>Guard decision · {amount} SOL to {short(to)}</p>
          {busy === to || !decision ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-stone-600">Reading {short(to)}’s on-chain history and verifying Vera’s signature…</p>
              {[70, 55, 62].map((w) => <div key={w} className="h-4 animate-pulse rounded-full bg-stone-100" style={{ width: `${w}%` }} />)}
            </div>
          ) : (
            <>
              <p className={`mt-3 font-serif text-5xl font-medium tracking-tight ${ACTION[decision.action].cls}`}>{ACTION[decision.action].word}</p>
              <p className="mt-1 text-sm text-stone-600">{ACTION[decision.action].note}</p>
              <ul className="mt-5 space-y-2">
                {decision.findings.length === 0 && <li className="text-[15px] text-stone-800">No rule fired.</li>}
                {decision.findings.map((f) => (
                  <li key={f.code + f.message} className="flex gap-3 text-[15px] text-stone-800">
                    <span className={`mt-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${f.action === 'block' ? 'bg-low/10 text-low' : 'bg-medium/10 text-medium'}`}>{f.action}</span>
                    <span>{f.message}</span>
                  </li>
                ))}
              </ul>
              {check?.ok && (
                <div className="mt-6 border-t border-stone-200 pt-5">
                  <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="font-serif text-3xl font-medium">{check.score ?? '—'}</span>
                    <span className={`text-[11px] font-bold tracking-[0.18em] uppercase ${TIER_TEXT[check.tier]}`}>{check.tier} trust</span>
                    <span className="font-mono text-xs text-stone-600">{check.verified ? 'signature verified in your browser ✓' : 'signature invalid'}</span>
                    {linkResults && check.attestationId !== sample.id && <a href={`/a/${check.attestationId}`} className="ml-auto text-xs font-semibold text-brick underline underline-offset-4">Open result</a>}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {check.reasons.slice(0, 4).map((r) => (
                      <li key={r.text} className="flex items-start gap-2.5 text-sm text-stone-700">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${GLYPH[r.kind] ?? GLYPH.info}`} aria-hidden />{r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {check && !check.ok && <p className="mt-4 text-sm text-low">Vera could not check this address: {check.error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
