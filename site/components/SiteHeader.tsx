'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/docs', 'Docs'],
  ['/changelog', 'Changelog'],
  ['https://www.npmjs.com/package/veralayer', 'npm'],
  ['https://github.com/veraagent/vera', 'GitHub'],
] as const;

// one header for every page; the button points somewhere useful from wherever you are
export default function SiteHeader() {
  const path = usePathname();
  const inDocs = path.startsWith('/docs');
  const cta = inDocs ? ['/#try', 'Try it'] : ['/docs', 'Read the docs'];
  const active = (href: string) => (href === '/docs' ? inDocs : path === href);
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="font-serif text-2xl tracking-tight" aria-label="Vera Agent home">
          <span className="italic font-bold text-brick">Vera</span> <span className="font-medium">Agent</span>
        </Link>
        <div className="hidden items-center gap-9 text-xs font-semibold tracking-[0.1em] uppercase sm:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className={active(href) ? 'text-brick' : 'text-stone-800 hover:text-brick'}>{label}</a>
          ))}
        </div>
        <Link href={cta[0]} className="rounded-xl bg-black px-5 py-2.5 text-xs font-bold tracking-[0.1em] text-white uppercase hover:bg-stone-800">{cta[1]}</Link>
      </nav>
      <div className="flex gap-6 border-t border-stone-100 px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase sm:hidden">
        {LINKS.map(([href, label]) => <a key={href} href={href} className={active(href) ? 'text-brick' : 'text-stone-700'}>{label}</a>)}
      </div>
    </header>
  );
}
