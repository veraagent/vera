import DocsNav from '@/components/DocsNav';
import DocsPager from '@/components/DocsPager';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[13rem_1fr] lg:py-14">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start"><DocsNav /></aside>
        <details className="rounded-xl border border-stone-200 px-4 py-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">Docs menu</summary>
          <div className="mt-4"><DocsNav /></div>
        </details>
        <article className="docs min-w-0 max-w-3xl">{children}<DocsPager /></article>
      </div>
    </>
  );
}
