'use client';
import { useState } from 'react';

// light code block with a filename/label and a quiet copy icon
export default function Code({ children, label }: { children: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(children).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); });
  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
        <span className="font-mono text-[11px] text-stone-500">{label ?? ''}</span>
        <button type="button" onClick={copy} aria-label="Copy code" title="Copy" className="text-stone-500 hover:text-black">
          {done
            ? <svg viewBox="0 0 20 20" className="h-4 w-4 text-high" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>
            : <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M13 4.5V4a1.5 1.5 0 00-1.5-1.5h-7A1.5 1.5 0 003 4v7a1.5 1.5 0 001.5 1.5H5" /></svg>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-stone-800"><code>{children}</code></pre>
    </div>
  );
}
