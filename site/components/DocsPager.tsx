'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS } from './DocsNav';

// previous / next cards at the bottom of every docs page, in sidebar order
export default function DocsPager() {
  const path = usePathname();
  const flat = DOCS.flatMap(([, links]) => links.map(([href, label]) => ({ href, label })));
  const i = flat.findIndex((l) => l.href === path);
  if (i < 0) return null;
  const prev = flat[i - 1], next = flat[i + 1];
  const card = 'flex-1 rounded-xl border border-stone-200 p-4 hover:border-stone-400';
  return (
    <nav aria-label="Docs pages" className="mt-14 flex gap-3 border-t border-stone-200 pt-6 text-sm">
      {prev ? <Link href={prev.href} className={card}><span className="text-stone-500">← Previous</span><br /><span className="font-semibold">{prev.label}</span></Link> : <span className="flex-1" />}
      {next ? <Link href={next.href} className={`${card} text-right`}><span className="text-stone-500">Next →</span><br /><span className="font-semibold">{next.label}</span></Link> : <span className="flex-1" />}
    </nav>
  );
}
