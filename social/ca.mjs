// CA post kit, made only from a real mint: image + post text + reply explaining the fees.
//   node --env-file=C:/Users/Username/Desktop/checker/.env ca.mjs <MINT>   →  ca/ca-post.png, ca/post.txt, ca/reply.txt
// The ticker and name come from chain metadata (Helius DAS), never typed by hand.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'ca');
const require = createRequire(import.meta.url);
const mint = process.argv[2];
if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) { console.error('usage: node ca.mjs <MINT>'); process.exit(1); }

const rpc = process.env.HELIUS_RPC || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const j = await (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAsset', params: { id: mint } }) })).json();
const meta = j.result?.content?.metadata ?? {};
const symbol = (meta.symbol || '').trim();
if (!symbol) { console.error('no token metadata for this mint; check the address'); process.exit(1); }
const ticker = `$${symbol}`;

fs.mkdirSync(OUT, { recursive: true });
const post = `${ticker} is live.

${mint}

The only official address. It is also on veraagent.io.`;
const reply = `Why ${ticker}: the Vera API is free, but every check reads onchain history and runs Claude. Trading fees pay for that, so the guard stays free and open source.

Holding ${ticker} doesn't change any score. Nobody can pay for a better one.`;
fs.writeFileSync(path.join(OUT, 'post.txt'), post + '\n');
fs.writeFileSync(path.join(OUT, 'reply.txt'), reply + '\n');

// image: the serif V, the ticker large, the full CA, the site in lowercase
const raw = fs.readFileSync(path.join(ROOT, '..', 'brand', 'logo-final', 'v.svg'), 'utf8');
const [, vw, vh] = raw.match(/viewBox="0 0 (\d+) (\d+)"/);
const d = raw.match(/ d="([^"]+)"/)[1];
const FONTS = path.join(ROOT, '..', 'brand', 'fonts').split(path.sep).join('/');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Newsreader;font-weight:200 800;src:url(file:///${FONTS}/Newsreader.woff2)}
@font-face{font-family:Newsreader;font-weight:200 800;font-style:italic;src:url(file:///${FONTS}/Newsreader-italic.woff2)}
@font-face{font-family:JBM;font-weight:100 800;src:url(file:///${FONTS}/JetBrainsMono.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(file:///${FONTS}/Montserrat.woff2)}
*{margin:0;box-sizing:border-box}body{width:1600px;height:900px;overflow:hidden;font-family:Montserrat;background:radial-gradient(1100px 800px at 0% 0%,#FFD4D2 0,#fff 72%)}
</style><body>
<div style="position:absolute;left:96px;top:84px"><svg viewBox="0 0 ${vw} ${vh}" height="96"><path fill="#941900" fill-rule="evenodd" d="${d}"/></svg></div>
<div style="position:absolute;left:96px;top:260px;font-family:Newsreader;font-weight:600;font-size:200px;letter-spacing:-.03em;line-height:1">${ticker.replace(/</g, '&lt;')}</div>
<div style="position:absolute;left:100px;top:520px;font-family:Newsreader;font-style:italic;font-weight:700;font-size:56px;color:#941900">is live.</div>
<div style="position:absolute;left:96px;bottom:110px;font-family:JBM;font-size:30px;background:#fff;border:1.5px solid #E7E5E4;border-radius:16px;padding:20px 28px">${mint}</div>
<div style="position:absolute;right:96px;top:110px;font-size:24px;font-weight:600;color:#57534E">veraagent.io</div>
</body>`;
const hf = path.join(OUT, 'ca.html');
fs.writeFileSync(hf, html);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('file:///' + hf.split(path.sep).join('/'));
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(OUT, 'ca-post.png') });
await b.close();
fs.unlinkSync(hf);
console.log(`ca/ca-post.png, ca/post.txt, ca/reply.txt for ${ticker} (${meta.name ?? ''})`);
