// CA post image without the address (ticker only): node ca-image.mjs VeraAgent  →  ca/ca-post.png
// Left: the ticker. Right: three real guard decisions from the CLI (social/src/cli-pay-*.txt).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'ca');
const require = createRequire(import.meta.url);
const symbol = (process.argv[2] || '').replace(/^\$/, '');
if (!symbol) { console.error('usage: node ca-image.mjs <TICKER>'); process.exit(1); }
const ticker = `$${symbol}`;
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const short = (a) => `${a.slice(0, 4)}…${a.slice(-4)}`;
// pull amount, recipient, tier/score and the first finding from each real CLI run
const rows = ['allow', 'review', 'block'].map((k) => {
  const t = fs.readFileSync(path.join(ROOT, 'src', `cli-pay-${k}.txt`), 'utf8').split('\n').filter(Boolean);
  const [, verdict, amount] = t[0].match(/^(\w+)\s+(.+?) out/);
  const [, tier, score, addr] = t.find((l) => /^\s+(LOW|MEDIUM|HIGH) \d+/.test(l)).trim().match(/^(\w+) (\d+) (\S+)/);
  const f = t.find((l) => /^\s+(block|review)\s/.test(l));
  const why = f ? f.trim().replace(/^(block|review)\s+/, '').replace(/:.*$/, '').replace(/[1-9A-HJ-NP-Za-km-z]{4}…[1-9A-HJ-NP-Za-km-z]{4}/g, (m) => m) : 'no policy findings';
  return { verdict, amount, tier, score, addr: short(addr), why };
});
const col = { ALLOW: "#5FB477", REVIEW: "#E0A33A", BLOCK: "#F0714E" };
const card = (r) => `<div class="row">
  <div class="top"><span class="v" style="color:${col[r.verdict]};border-color:${col[r.verdict]}">${r.verdict}</span><span class="amt">${esc(r.amount)}</span><span class="to">→ ${r.addr}</span><span class="tier">${r.tier} ${r.score}</span></div>
  <div class="why">${esc(r.why)}</div></div>`;

const raw = fs.readFileSync(path.join(ROOT, '..', 'brand', 'logo-final', 'v.svg'), 'utf8');
const [, vw, vh] = raw.match(/viewBox="0 0 (\d+) (\d+)"/);
const d = raw.match(/ d="([^"]+)"/)[1];
const FONTS = path.join(ROOT, '..', 'brand', 'fonts').split(path.sep).join('/');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Newsreader;font-weight:200 800;src:url(file:///${FONTS}/Newsreader.woff2)}
@font-face{font-family:Newsreader;font-weight:200 800;font-style:italic;src:url(file:///${FONTS}/Newsreader-italic.woff2)}
@font-face{font-family:JBM;font-weight:100 800;src:url(file:///${FONTS}/JetBrainsMono.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(file:///${FONTS}/Montserrat.woff2)}
*{margin:0;box-sizing:border-box}
body{width:1600px;height:900px;overflow:hidden;font-family:Montserrat;background:radial-gradient(900px 700px at 0% 0%,#FFD4D2 0,rgba(255,255,255,0) 70%),radial-gradient(800px 600px at 100% 100%,#FFE4DC 0,#fff 70%)}
.t{position:absolute;left:96px;top:300px;font-family:Newsreader;font-weight:600;font-size:108px;letter-spacing:-.035em;line-height:1}
.live{position:absolute;left:100px;top:432px;font-family:Newsreader;font-style:italic;font-weight:700;font-size:64px;color:#941900}
.sub{position:absolute;left:100px;top:548px;width:540px;font-size:24px;line-height:1.5;color:#57534E}
.url{position:absolute;left:100px;bottom:92px;font-size:24px;font-weight:600;color:#1C1917}
.panel{position:absolute;right:80px;top:50%;transform:translateY(-50%);width:740px;background:#0C0A09;border-radius:48px;padding:52px 48px;color:#F5F5F4;font-family:JBM}
.cmd{font-size:20px;color:#A8A29E;margin-bottom:34px}.cmd b{color:#F5F5F4;font-weight:500}
.row{border-top:1px solid #292524;padding:30px 0}.row:last-child{border-bottom:1px solid #292524}
.top{display:flex;align-items:center;gap:22px;font-size:24px}
.v{font-weight:700;font-size:20px;letter-spacing:.08em;border:1.5px solid;border-radius:10px;padding:6px 12px;min-width:118px;text-align:center}
.amt{font-weight:600}.to{color:#A8A29E}.tier{margin-left:auto;color:#D6D3D1;font-size:20px}
.why{margin-top:14px;font-size:18px;color:#A8A29E;font-family:Montserrat}
</style><body>
<div style="position:absolute;left:96px;top:96px"><svg viewBox="0 0 ${vw} ${vh}" height="84"><path fill="#941900" fill-rule="evenodd" d="${d}"/></svg></div>
<div class="t">${esc(ticker)}</div>
<div class="live">is live.</div>
<div class="sub">The payment guard for AI agents on Solana. Holder access is coming next.</div>
<div class="url">veraagent.io</div>
<div class="panel"><div class="cmd">$ <b>npx veralayer pay</b></div>${rows.map(card).join('')}</div>
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
console.log(`ca/ca-post.png for ${ticker}`);
