'use client';
import { useState } from 'react';

// npm command in a quiet input-like box; the icon swaps to a check once copied
export default function CopyCommand({ command }: { command: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(command).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); });
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${command}`} title="Copy"
      className="inline-flex h-[52px] items-center gap-5 rounded-xl border border-stone-200 bg-white pl-5 pr-4 font-mono text-[15px] text-stone-900 transition hover:border-stone-400">
      {command}
      {done ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-high" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M13 4.5V4a1.5 1.5 0 00-1.5-1.5h-7A1.5 1.5 0 003 4v7a1.5 1.5 0 001.5 1.5H5" /></svg>
      )}
    </button>
  );
}
