import Simulator from '@/components/Simulator';
import CopyCommand from '@/components/CopyCommand';
import sample from '@/lib/sample-check.json';
import { loadStats, storeEnabled } from '@/lib/engine';

export const revalidate = 60;


const GUARD = `import { VeraGuard } from 'veralayer';

const guard = new VeraGuard({
  connection,
  policy: { minTier: 'medium', dailyLimitSol: 20 },
});

// was: connection.sendTransaction(tx, [agent])
await guard.sendTransaction(tx, [agent]);`;

// the parts of a real signed response an agent actually reads
const a = sample.attestation;
const RESPONSE = { score: a.score, tier: a.tier, reasons: a.reasons.slice(0, 3).map((r) => (r.text.length > 46 ? r.text.slice(0, 45) + '…' : r.text)), signature: `${sample.signature.slice(0, 20)}…`, method: a.method };

function JsonView({ value }: { value: unknown }) {
  const parts = JSON.stringify(value, null, 2).split(/("(?:[^"\\]|\\.)*")(\s*:)/g);
  return (
    <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-stone-700">
      <code>{parts.map((p, i) => (i % 3 === 1 ? <span key={i} className="text-brick">{p}</span> : p))}</code>
    </pre>
  );
}

const STEPS = [
  ['Read', 'Last 100 transactions, wallet age, who funded it.'],
  ['Score', 'Deterministic 0–100 from on-chain features.'],
  ['Explain', 'Claude may adjust by ±15, citing a feature.'],
  ['Sign', 'ed25519, verified locally before your policy runs.'],
];


export default async function Home() {
  const stats = await loadStats();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-black focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <main id="main">
        <section className="wash-tl">
          <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
            <h1 className="font-serif text-5xl font-medium leading-[1.04] tracking-[-0.025em] sm:text-7xl">
              Your agent signs. <span className="accent whitespace-nowrap">Vera checks first.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-stone-600">A payment guard for AI agents on Solana.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CopyCommand command="npm install veralayer" />
              <a href="/docs" className="inline-flex h-[52px] items-center rounded-xl bg-black px-7 text-xs font-bold tracking-[0.1em] text-white uppercase hover:bg-stone-800">Quickstart</a>
            </div>
          </div>
          <div id="try" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
            <Simulator linkResults={storeEnabled()} />
            {stats && stats.checks > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
                {[
                  ['Recipients checked', stats.checks],
                  ['Checked today', stats.today],
                  ['Scored low trust', stats.low],
                  ['Scored high trust', stats.high],
                ].map(([k, v]) => (
                  <div key={k as string}><dd className="font-serif text-4xl font-medium">{(v as number).toLocaleString('en-US')}</dd><dt className="mt-1 text-[11px] font-bold tracking-[0.16em] text-stone-600 uppercase">{k}</dt></div>
                ))}
              </dl>
            )}
          </div>
        </section>

        <section id="install" className="wash-br scroll-mt-16 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center font-serif text-5xl font-medium tracking-tight">Swap one call</h2>
            <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
              <div className="card overflow-hidden">
                <p className="border-b border-stone-200 px-5 py-3 font-mono text-[11px] text-stone-500">agent.ts</p>
                <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-stone-800"><code>{GUARD}</code></pre>
              </div>
              <div className="card overflow-hidden">
                <p className="flex justify-between border-b border-stone-200 px-5 py-3 font-mono text-[11px] text-stone-500"><span>vera result</span><span className="text-high">real · signed</span></p>
                <JsonView value={RESPONSE} />
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-16 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center font-serif text-5xl font-medium tracking-tight">How it works</h2>
            <ol className="mt-14 grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([t, d], i) => (
                <li key={t}>
                  <span className="font-serif text-5xl font-bold italic text-brick">{i + 1}.</span>
                  <h3 className="mt-5 font-serif text-2xl font-medium">{t}</h3>
                  <p className="mx-auto mt-2 max-w-[15rem] text-stone-600">{d}</p>
                </li>
              ))}
            </ol>
            <p className="mx-auto mt-16 max-w-xl text-center text-[13px] text-stone-600">
              A score is a signal, not a guarantee. Results are signed, not yet anchored on-chain. The VeraLayer team receives a share of the token’s trading fees; holding it does not affect any score.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
