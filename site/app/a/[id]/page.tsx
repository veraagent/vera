import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttestation } from '@/lib/engine';
import VerifyBadge from '@/components/VerifyBadge';
import Code from '@/components/Code';
import type { Attestation } from '@/lib/veraagent/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const r = await getAttestation((await params).id);
  if (!r) return { title: 'Result not found' };
  const a = r.attestation;
  return { title: `${a.score ?? '—'}/100 ${a.tier} · ${a.subject.slice(0, 4)}…${a.subject.slice(-4)}`, description: a.reasons.map((x) => x.text).join(' ') };
}

const TIER: Record<string, string> = { high: 'text-high', medium: 'text-medium', low: 'text-low', unknown: 'text-unknown' };
const DOT: Record<string, string> = { ok: 'bg-high', warn: 'bg-medium', bad: 'bg-low', info: 'bg-unknown' };

export default async function Page({ params }: Params) {
  const { id } = await params;
  const r = await getAttestation(id);
  if (!r) notFound();
  const a = r.attestation as unknown as Attestation;
  const summary = (r as { summary?: string | null }).summary;

  return (
    <>
      <main className="wash-tl">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-[11px] font-bold tracking-[0.18em] text-stone-600 uppercase">Signed Vera result</h1>
          <p className="mt-3 break-all font-mono text-sm text-stone-800">{a.subject}</p>
          <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3">
            <span className="font-serif text-8xl font-medium leading-none tracking-tight">{a.score ?? '—'}</span>
            <span className={`pb-3 text-sm font-bold tracking-[0.18em] uppercase ${TIER[a.tier]}`}>{a.tier} trust</span>
          </div>
          <div className="mt-5"><VerifyBadge attestation={a} signature={r.signature} /></div>
          {summary && <p className="mt-8 font-serif text-2xl leading-snug text-stone-800">{summary}</p>}
          <ul className="mt-8 space-y-3">
            {a.reasons.map((x) => (
              <li key={x.text} className="flex items-start gap-3 text-stone-800"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[x.kind] ?? DOT.info}`} aria-hidden />{x.text}</li>
            ))}
          </ul>
          <dl className="mt-10 divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {[
              ['Issued', new Date(a.issued_at).toUTCString()],
              ['Expires', new Date(a.expires_at).toUTCString()],
              ['Method', a.method],
              ['Issuer key', a.issuer],
              ['Result id', id],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]"><dt className="text-stone-500">{k}</dt><dd className="break-all font-mono text-stone-800">{v}</dd></div>
            ))}
          </dl>
          <h2 className="mt-12 font-serif text-2xl font-medium">Verify it yourself</h2>
          <Code label="verify.ts">{`import { Vera } from 'veralayer';

const r = await fetch(
  'https://veraagent.io/v1/attestations/${id}'
).then((x) => x.json());
await new Vera().verify(r);   // { valid: true, expired: … }`}</Code>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#try" className="rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] text-white uppercase hover:bg-stone-800">Check another address</Link>
            <Link href="/docs/api" className="rounded-xl border border-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] uppercase hover:bg-black hover:text-white">How verification works</Link>
          </div>
        </div>
      </main>
    </>
  );
}
