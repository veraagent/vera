import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-serif text-xl tracking-tight"><span className="italic font-bold text-brick">Vera</span> Agent</span>
          <span className="text-[11px] tracking-[0.2em] text-stone-600 uppercase">by <span className="font-logo font-bold normal-case tracking-[-0.04em] text-stone-900 text-[13px]">VeraLayer</span> · © {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap gap-7 text-[11px] font-semibold tracking-[0.2em] text-stone-700 uppercase">
          <Link href="/docs" className="hover:text-brick">Docs</Link>
          <Link href="/changelog" className="hover:text-brick">Changelog</Link>
          <a href="https://www.npmjs.com/package/veralayer" className="hover:text-brick">npm</a>
          <a href="https://pypi.org/project/veralayer/" className="hover:text-brick">PyPI</a>
          <a href="https://github.com/veraagent/vera" className="hover:text-brick">GitHub</a>
          <a href="/.well-known/vera.json" className="hover:text-brick">Public key</a>
          <a href="https://x.com/veraagentio" className="hover:text-brick">X</a>
        </div>
      </div>
    </footer>
  );
}
