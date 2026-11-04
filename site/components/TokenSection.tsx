import CopyCommand from '@/components/CopyCommand';
import type { Token } from '@/lib/engine';

// Rendered on the home page only once the team has set the CA (see /admin/token).
export default function TokenSection({ token }: { token: Token }) {
  const ticker = token.symbol ? `$${token.symbol}` : token.name ?? 'Token';
  const links = [
    ['Solscan', `https://solscan.io/token/${token.ca}`],
    ['DexScreener', `https://dexscreener.com/solana/${token.ca}`],
    ...(token.ca.endsWith('pump') ? [['pump.fun', `https://pump.fun/coin/${token.ca}`]] : []),
  ];
  return (
    <section id="token" className="wash-r scroll-mt-16 py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="font-serif text-5xl font-medium tracking-tight">{ticker}</h2>
        {token.name && token.symbol && <p className="mt-2 text-stone-600">{token.name}</p>}
        <div className="mt-8 flex justify-center"><CopyCommand command={token.ca} /></div>
        <div className="mt-5 flex flex-wrap justify-center gap-6 text-xs font-semibold tracking-[0.12em] uppercase">
          {links.map(([l, h]) => <a key={l} href={h} className="text-stone-700 hover:text-brick">{l}</a>)}
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-8 text-left sm:grid-cols-2">
          <div>
            <h3 className="font-serif text-2xl font-medium">Why trading fees go to the team</h3>
            <p className="mt-3 text-stone-600">The Vera API is free to use. Every check still costs real money: reading up to 3,000 signatures and parsing 100 transactions on Solana RPC, a Claude Opus 5.5 call to explain the score, hosting and storage. Trading fees from {ticker} pay for that, so the guard stays free and the code stays open.</p>
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium">Holder access is next</h3>
            <p className="mt-3 text-stone-600">Gated access for {ticker} holders is coming next. This is the only official address; it is published here and on @veraagentio.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
