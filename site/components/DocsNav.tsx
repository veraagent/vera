'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const DOCS = [
  ['Getting started', [['/docs', 'Quickstart'], ['/docs/guard', 'Guarding transactions'], ['/docs/policy', 'Policy reference']]],
  ['Integrations', [['/docs/mcp', 'MCP (Claude, Cursor)'], ['/docs/agent-kit', 'Solana Agent Kit'], ['/docs/python', 'Python'], ['/docs/cli', 'CLI']]],
  ['Reference', [['/docs/api', 'HTTP API'], ['/docs/scoring', 'How scoring works']]],
] as const;

export default function DocsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Docs" className="space-y-7 text-sm">
      {DOCS.map(([group, links]) => (
        <div key={group}>
          <p className="text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">{group}</p>
          <ul className="mt-2.5 space-y-0.5">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={`block rounded-lg px-3 py-1.5 ${path === href ? 'bg-stone-100 font-semibold text-brick' : 'text-stone-600 hover:text-black'}`}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
