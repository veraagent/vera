'use client';
import { useEffect, useState } from 'react';

// Team-only: paste the CA to reveal the token section on the home page. Needs the admin key.
export default function AdminToken() {
  const [key, setKey] = useState('');
  const [ca, setCa] = useState('');
  const [current, setCurrent] = useState<{ ca: string; symbol: string | null; name: string | null } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setKey(sessionStorage.getItem('vera-admin-key') ?? ''); } catch { /* storage blocked */ }
    fetch('/v1/token').then((r) => r.json()).then((j) => setCurrent(j.token));
  }, []);

  async function send(method: 'POST' | 'DELETE') {
    setBusy(true); setMsg('');
    try { sessionStorage.setItem('vera-admin-key', key); } catch { /* storage blocked */ }
    const r = await fetch('/v1/token', { method, headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: method === 'POST' ? JSON.stringify({ ca: ca.trim() }) : undefined });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? `error ${r.status}`);
    setCurrent(j.token);
    setMsg(j.token ? `Live on veraagent.io: ${j.token.symbol ? '$' + j.token.symbol : j.token.name}` : 'Token section hidden.');
  }

  const field = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-mono text-sm focus:border-brick focus:outline-none';
  return (
    <main className="wash-tl min-h-[70vh]">
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Token</h1>
        <p className="mt-2 text-stone-600">Paste the mint address. The token section appears on the home page as soon as it is saved.</p>
        <p className="mt-6 text-sm text-stone-600">Currently: {current ? <b className="font-mono">{current.symbol ? `$${current.symbol}` : current.name} · {current.ca}</b> : 'hidden (no CA set)'}</p>
        <label className="mt-8 block text-sm text-stone-600" htmlFor="k">Admin key</label>
        <input id="k" type="password" value={key} onChange={(e) => setKey(e.target.value)} className={`${field} mt-1.5`} autoComplete="off" />
        <label className="mt-5 block text-sm text-stone-600" htmlFor="ca">Contract address (mint)</label>
        <input id="ca" value={ca} onChange={(e) => setCa(e.target.value)} className={`${field} mt-1.5`} spellCheck={false} autoComplete="off" />
        <div className="mt-6 flex gap-3">
          <button disabled={busy || !key || !ca.trim()} onClick={() => send('POST')} className="rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] text-white uppercase disabled:opacity-40">Publish CA</button>
          {current && <button disabled={busy || !key} onClick={() => send('DELETE')} className="rounded-xl border border-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] uppercase disabled:opacity-40">Hide</button>}
        </div>
        {msg && <p role="status" className="mt-5 text-sm font-semibold">{msg}</p>}
      </div>
    </main>
  );
}
