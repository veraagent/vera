import Link from 'next/link';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <main className="wash-tl">
      <div className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
        <h1 className="font-serif text-6xl font-medium tracking-tight">Nothing <span className="accent">here.</span></h1>
        <p className="mx-auto mt-5 max-w-md text-stone-600">The page doesn’t exist, or the result has expired. Every Vera result also verifies on its own, so a saved copy is still valid proof.</p>
        <div className="mt-9 flex justify-center gap-3">
          <Link href="/" className="rounded-xl bg-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] text-white uppercase hover:bg-stone-800">Home</Link>
          <Link href="/docs" className="rounded-xl border border-black px-6 py-3.5 text-xs font-bold tracking-[0.1em] uppercase hover:bg-black hover:text-white">Docs</Link>
        </div>
      </div>
    </main>
  );
}
