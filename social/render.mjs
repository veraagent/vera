// Social kit renderer: X post images, header, avatar and article cover, all from real product output.
//   node render.mjs            (needs the site on http://localhost:3211 for the live screenshots)
// Visuals follow veralayer.io: white + blush washes, Newsreader headlines with one italic brick phrase, light code cards.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const FONTS = path.join(ROOT, '..', 'brand', 'fonts').replace(/\\/g, '/');
const SITE = process.env.SITE || 'http://localhost:3211';
const OUT = path.join(ROOT, 'images');
const SHOTS = path.join(ROOT, 'build', 'shots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const read = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').replace(/\r/g, '').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (f) => `file:///${path.join(SHOTS, f).replace(/\\/g, '/')}`;

const CSS = `
@font-face{font-family:Newsreader;font-weight:200 800;font-style:normal;src:url(file:///${FONTS}/Newsreader.woff2)}
@font-face{font-family:Newsreader;font-weight:200 800;font-style:italic;src:url(file:///${FONTS}/Newsreader-italic.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(file:///${FONTS}/Montserrat.woff2)}
@font-face{font-family:Poppins;font-weight:700;src:url(file:///${FONTS}/Poppins-700.woff2)}
@font-face{font-family:JBM;font-weight:100 800;src:url(file:///${FONTS}/JetBrainsMono.woff2)}
*{box-sizing:border-box;margin:0}
body{font-family:Montserrat;color:#000;background:#fff;overflow:hidden}
.frame{position:relative;width:100%;height:100%;overflow:hidden}
.wash-tl{background:radial-gradient(circle at 0% 0%,#FFD4D2 0,#fff 62%)}
.wash-br{background:radial-gradient(circle at 100% 100%,#FFD4D2 0,#fff 62%)}
.wash-tr{background:radial-gradient(circle at 100% 0%,#FFD4D2 0,#fff 60%)}
.wash-bl{background:radial-gradient(circle at 0% 100%,#FFD4D2 0,#fff 60%)}
.serif{font-family:Newsreader;font-weight:500;letter-spacing:-.025em;line-height:1.02}
.it{font-style:italic;font-weight:700;color:#941900}
.label{font-size:15px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#57534E}
.brand{position:absolute;font-family:Newsreader;font-size:30px;letter-spacing:-.02em}
.brand i{font-weight:700;color:#941900}
.url{position:absolute;font-size:16px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#57534E}
.card{background:#fff;border:1.5px solid #E7E5E4;border-radius:28px;box-shadow:0 30px 60px -20px rgba(90,26,10,.16)}
.code{font-family:JBM;font-size:22px;line-height:1.55;color:#292524;white-space:pre}
.code .c{color:#A8A29E}.code .k{color:#941900}.code .s{color:#166534}
.term{font-family:JBM;font-size:21px;line-height:1.6;white-space:pre;color:#292524}
.bar{display:flex;justify-content:space-between;padding:16px 26px;border-bottom:1.5px solid #E7E5E4;font-family:JBM;font-size:15px;color:#78716C}
.pill{display:inline-flex;align-items:center;gap:14px;border:1.5px solid #E7E5E4;background:#fff;border-radius:16px;padding:18px 26px;font-family:JBM;font-size:26px}
.g{color:#166534}.y{color:#92400E}.r{color:#B91C1C}.m{color:#78716C}.b{font-weight:700}
`;

// minimal highlighter: one left-to-right pass, so a comment after a string (or vice versa) can't nest spans
function hl(src) {
  const re = /(\/\/[^\n]*|#[^\n]*)|('[^'\n]*'|"[^"\n]*")|\b(import|from|const|await|new|try|catch|if|async|return|def|except|as)\b/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    out += `<span class="${m[1] ? 'c' : m[2] ? 's' : 'k'}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
// colour the CLI output the way the terminal does
function term(src) {
  return esc(src).split('\n').map((l) => l
    .replace(/^(ALLOW)/, '<span class="g b">$1</span>').replace(/^(REVIEW)/, '<span class="y b">$1</span>').replace(/^(BLOCK)/, '<span class="r b">$1</span>')
    .replace(/(\d+\/100 LOW)/, '<span class="r b">$1</span>')
    .replace(/^(\s+)(LOW|MEDIUM|HIGH)( \d+)/, (_, s, t, n) => `${s}<span class="${t === 'LOW' ? 'r' : t === 'MEDIUM' ? 'y' : 'g'}">${t}${n}</span>`)
    .replace(/^(\s+)(block)(\s)/, '$1<span class="r">$2</span>$3').replace(/^(\s+)(review)(\s)/, '$1<span class="y">$2</span>$3')
    .replace(/^(\s+)(×)/, '$1<span class="r">$2</span>').replace(/^(\s+)(!)/, '$1<span class="y">$2</span>').replace(/^(\s+)(✓)/, '$1<span class="g">$2</span>')
    .replace(/(signature ✓|signature verified)/, '<span class="g">$1</span>')
    .replace(/^(attestation .*|signature verified.*expires.*)$/, '<span class="m">$1</span>')).join('\n');
}
// shorten long addresses so lines fit
const shortAddr = (s) => s.replace(/\b([1-9A-HJ-NP-Za-km-z]{6})[1-9A-HJ-NP-Za-km-z]{28,}([1-9A-HJ-NP-Za-km-z]{4})\b/g, '$1…$2');

const brand = (pos = 'left:72px;top:58px') => `<div class="brand" style="${pos}"><i>Vera</i> Agent</div>`;
const url = (pos = 'right:72px;top:68px', text = 'veraagent.io') => `<div class="url" style="${pos}">${text}</div>`;

const W = 1600, H = 900;
const pages = [];
const add = (name, w, h, body) => pages.push({ name, w, h, body });

// 01 launch: headline + install commands + the real simulator blocking a flagged wallet
add('01-launch', W, H, `<div class="frame wash-tl">${brand()}${url()}
  <div style="position:absolute;left:72px;top:170px;width:680px">
    <div class="serif" style="font-size:76px">Your agent signs.<br><span class="it">Vera checks first.</span></div>
    <p style="margin-top:30px;font-size:24px;line-height:1.5;color:#57534E">A payment guard for AI agents on Solana. It decodes every transaction, scores each recipient and enforces your policy before anything is signed.</p>
    <div style="margin-top:34px;display:flex;flex-direction:column;gap:12px;align-items:flex-start">
      <div class="pill"><span class="m">$</span>npm install veralayer</div>
    </div>
  </div>
  <img src="${img('sim-blocked.png')}" style="position:absolute;right:56px;top:140px;width:760px;border-radius:28px;box-shadow:0 40px 80px -24px rgba(90,26,10,.25)">
</div>`);

// 02 decode: what the guard sees inside one transaction
add('02-decode', W, H, `<div class="frame wash-br">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px;width:1000px">Agents sign transactions, <span class="it">not “payments”.</span></div>
  <div style="position:absolute;left:72px;right:72px;top:330px;display:grid;grid-template-columns:1fr 70px 1fr 70px .8fr;align-items:center">
    <div class="card" style="padding:30px 32px">
      <div class="label">The transaction</div>
      <div class="term" style="margin-top:18px;font-size:19px">system.transfer      0.25 SOL → AgmL…zN51
ata.create           for 7xKq…3pVd
token.transferChecked 500 USDC → 9fQe…tA2c
jupiter.route        swap</div>
    </div>
    <div style="text-align:center;font-size:44px;color:#A8A29E">→</div>
    <div class="card" style="padding:30px 32px">
      <div class="label">What the guard decodes</div>
      <div class="term" style="margin-top:18px;font-size:19px">SOL    0.25 → AgmL…zN51
USDC   500  → <span class="b">7xKq…3pVd</span>
       <span class="m">token account 9fQe…tA2c,
       created in this tx, owner resolved</span>
<span class="y">review</span> Jupiter value not decoded</div>
    </div>
    <div style="text-align:center;font-size:44px;color:#A8A29E">→</div>
    <div class="card" style="padding:30px 32px;text-align:center">
      <div class="label">Each recipient</div>
      <div class="serif" style="font-size:44px;margin-top:16px">scored,<br>signed,<br><span class="it">checked.</span></div>
    </div>
  </div>
  <p style="position:absolute;left:72px;bottom:70px;font-size:22px;color:#57534E">A token account is not a wallet. The guard resolves who actually receives the money.</p>
</div>`);

// 03 policy as code
add('03-policy', W, H, `<div class="frame wash-tr">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px">Spending rules, <span class="it">in code.</span></div>
  <div class="card" style="position:absolute;left:72px;top:290px;width:760px;overflow:hidden">
    <div class="bar"><span>policy.ts</span></div>
    <div class="code" style="padding:28px 32px">${hl(`const guard = new VeraGuard({
  connection,
  policy: {
    minTier: 'medium',
    tierLimitsSol: { high: 50, medium: 5 },
    dailyLimitSol: 20,
    tokenLimits: { [USDC]: 500 },
    deny: [knownDrainer],
  },
});`)}</div>
  </div>
  <div class="card" style="position:absolute;left:870px;right:72px;top:290px;overflow:hidden">
    <div class="bar"><span>guard.evaluatePayment</span><span>3 SOL · 19 spent today</span></div>
    <div style="padding:30px 34px">
      <div class="serif r" style="font-size:66px">Blocked.</div>
      <div style="margin-top:20px;font-size:22px;line-height:1.5;color:#292524"><span class="r b" style="font-size:15px;letter-spacing:.12em">BLOCK</span> &nbsp;This would bring today’s spend to 22 SOL, over your 20 SOL daily limit</div>
      <div style="margin-top:24px;font-family:JBM;font-size:17px;color:#78716C">code: daily_limit</div>
    </div>
  </div>
</div>`);

// 04 signature: the real public result page
add('04-signed', W, H, `<div class="frame wash-bl">${brand()}${url()}
  <div style="position:absolute;left:72px;top:170px;width:560px">
    <div class="serif" style="font-size:66px">Every score is <span class="it">signed.</span></div>
    <p style="margin-top:30px;font-size:24px;line-height:1.55;color:#57534E">ed25519 over key-sorted JSON. The library checks it against Vera’s key, pinned in the package, before your policy runs.</p>
    <p style="margin-top:22px;font-size:24px;line-height:1.55;color:#57534E">Edit one byte of the signed result, or replay another address’s, and the payment is blocked.</p>
  </div>
  <img src="${img('result-page.png')}" style="position:absolute;right:72px;top:120px;width:720px;border-radius:24px;border:1.5px solid #E7E5E4;box-shadow:0 40px 80px -24px rgba(90,26,10,.22)">
</div>`);

// 05 how scoring works
const STEPS = [
  ['01', 'Read', '3,000 signatures, the last 100 transactions parsed, and the first funder when the history fits.'],
  ['02', 'Score', 'Deterministic 0–100 from on-chain features. An address on the flagged list is capped at 5.'],
  ['03', 'Explain', 'Claude Opus 5.5 may move it ±15. Every reason must cite a feature.'],
  ['04', 'Sign', 'ed25519. Verified locally before your policy runs.'],
];
add('05-scoring', W, H, `<div class="frame wash-tl">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:150px;font-size:68px">Rules first. The model second.<br><span class="it">A signature last.</span></div>
  <div style="position:absolute;left:72px;right:72px;top:420px;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:#E7E5E4;border:1.5px solid #E7E5E4;border-radius:28px;overflow:hidden">
    ${STEPS.map(([n, t, d]) => `<div style="background:#fff;padding:34px 30px;height:330px"><div style="font-family:JBM;font-size:17px;color:#A8A29E">${n}</div><div class="serif" style="font-size:44px;margin-top:14px">${t}</div><p style="margin-top:16px;font-size:21px;line-height:1.5;color:#57534E">${d}</p></div>`).join('')}
  </div>
</div>`);

// 06 MCP
add('06-mcp', W, H, `<div class="frame wash-br">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px">Give Claude a <span class="it">payment check.</span></div>
  <div class="card" style="position:absolute;left:72px;top:290px;width:700px;overflow:hidden">
    <div class="bar"><span>claude_desktop_config.json</span></div>
    <div class="code" style="padding:28px 32px">${hl(`{
  "mcpServers": {
    "vera": {
      "command": "npx",
      "args": ["-y", "veralayer", "mcp"]
    }
  }
}`)}</div>
  </div>
  <div class="card" style="position:absolute;left:810px;right:72px;top:290px;overflow:hidden">
    <div class="bar"><span>tool · vera_guard_payment</span><span>to 293B…ffYy · 2 SOL</span></div>
    <div class="term" style="padding:28px 32px;font-size:19px;white-space:pre-wrap">${term(shortAddr(read('mcp-guard.txt'))).replace(/^- block/gm, '- <span class="r">block</span>')}</div>
  </div>
  <p style="position:absolute;left:72px;bottom:70px;font-size:22px;color:#57534E">Works in Claude Desktop, Claude Code, Cursor and any MCP client. Tools: vera_check, vera_guard_payment.</p>
</div>`);

// 07 Python
add('07-python', W, H, `<div class="frame wash-tr">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px">Also in <span class="it">Python.</span></div>
  <div class="card" style="position:absolute;left:72px;top:290px;width:820px;overflow:hidden">
    <div class="bar"><span>agent.py</span><span>pip install veralayer</span></div>
    <div class="code" style="padding:28px 32px;font-size:21px">${hl(`from veralayer import (
    VeraGuard, VeraBlockedError, VeraReviewRequiredError,
)

guard = VeraGuard(policy={
    "min_tier": "medium",
    "daily_limit_sol": 20,
})

try:
    guard.authorize(to=recipient, amount_sol=1.5)
    send_sol(recipient, 1.5)
except (VeraBlockedError, VeraReviewRequiredError) as e:
    log(e.decision["findings"])`)}</div>
  </div>
  <div style="position:absolute;left:940px;right:72px;top:300px">
    <p style="font-size:24px;line-height:1.55;color:#57534E">Same rules and finding codes as JS, for planned payments.</p>
    <p style="margin-top:22px;font-size:24px;line-height:1.55;color:#57534E">Signatures verify byte for byte across JS and Python, so a result checked in one verifies in the other.</p>
    <p style="margin-top:22px;font-size:24px;line-height:1.55;color:#57534E">One dependency: cryptography.</p>
  </div>
</div>`);

// 08 CLI: three real decisions
add('08-cli', W, H, `<div class="frame wash-bl">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px">Allow. Review. <span class="it">Block.</span></div>
  <div class="card" style="position:absolute;left:72px;right:72px;top:280px;overflow:hidden">
    <div class="bar"><span>terminal</span><span>npx veralayer pay &lt;address&gt; &lt;sol&gt;</span></div>
    <div class="term" style="padding:22px 34px;font-size:19.5px">${term(shortAddr([
      '$ npx veralayer pay AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51 1', read('cli-pay-allow.txt').split('\n').filter((l) => !l.includes('→')).join('\n'), '',
      '$ npx veralayer pay AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51 12', read('cli-pay-review.txt').split('\n').filter((l) => !l.includes('→')).join('\n'), '',
      '$ npx veralayer pay 293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy 1', read('cli-pay-block.txt').split('\n').filter((l) => !l.includes('→') && !l.includes('exceeds the 0')).join('\n'),
    ].join('\n')).replace(/(below your minimum of medium)[^\n]*/g, '$1'))}</div>
  </div>
</div>`);

// 09 fail closed
add('09-fail-closed', W, H, `<div class="frame wash-tl">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:150px;font-size:68px;width:900px">If Vera can’t answer, <span class="it">nothing gets paid.</span></div>
  <div class="card" style="position:absolute;left:72px;top:420px;width:700px;overflow:hidden">
    <div class="bar"><span>default policy</span></div>
    <div class="code" style="padding:28px 32px">${hl(`// defaults
onCheckError: 'block',  // down / forged
onUnknown:    'review', // no history`)}</div>
  </div>
  <div class="card" style="position:absolute;left:800px;right:72px;top:420px;padding:32px 36px">
    <div class="serif r" style="font-size:58px">Blocked.</div>
    <div style="margin-top:16px;font-size:22px;line-height:1.5;color:#292524"><span class="r b" style="font-size:15px;letter-spacing:.12em">BLOCK</span> &nbsp;Vera’s signature for AgmL…zN51 did not verify</div>
    <div style="margin-top:18px;font-family:JBM;font-size:17px;color:#78716C">code: bad_signature</div>
  </div>
</div>`);

// 10 human review
add('10-review', W, H, `<div class="frame wash-br">${brand()}${url()}
  <div class="serif" style="position:absolute;left:72px;top:140px;font-size:64px">Big payments wait <span class="it">for a human.</span></div>
  <div class="card" style="position:absolute;left:72px;top:290px;width:900px;overflow:hidden">
    <div class="bar"><span>agent.ts</span></div>
    <div class="code" style="padding:28px 32px">${hl(`const guard = new VeraGuard({
  connection,
  policy: { tierLimitsSol: { medium: 5 } },
  // over the limit → ask, don't guess
  onReview: (d) => askInTelegram(d.findings),
  onDecision: (d) => auditLog.write(d),
});`)}</div>
  </div>
  <div style="position:absolute;left:1020px;right:72px;top:310px">
    <div class="label">Three outcomes</div>
    <p style="margin-top:18px;font-size:24px;line-height:1.6;color:#292524"><span class="g b">allow</span> signs and sends</p>
    <p style="font-size:24px;line-height:1.6;color:#292524"><span class="y b">review</span> waits for onReview</p>
    <p style="font-size:24px;line-height:1.6;color:#292524"><span class="r b">block</span> throws, never sent</p>
    <p style="margin-top:26px;font-size:21px;line-height:1.55;color:#57534E">Every decision goes to onDecision with the rule that fired.</p>
  </div>
</div>`);

// X header 1500x500: content right of the avatar zone (bottom-left ~0..400 x 280..500)
add('x-header', 1500, 500, `<div class="frame wash-tr">
  <div style="position:absolute;left:470px;top:70px">
    <div class="serif" style="font-size:72px">Your agent signs.<br><span class="it">Vera checks first.</span></div>
    <div style="margin-top:30px;display:flex;gap:14px">
      <div class="pill" style="font-size:22px;padding:14px 22px"><span class="m">$</span>npm install veralayer</div>
      <div class="pill" style="font-size:22px;padding:14px 22px"><span class="m">$</span>pip install veralayer</div>
    </div>
  </div>
  ${url('right:56px;bottom:40px')}
</div>`);

// avatar 400: the brand mark on a blush wash
add('x-avatar', 400, 400, `<div class="frame" style="background:radial-gradient(circle at 20% 15%,#FFD4D2 0,#fff 75%);display:grid;place-items:center">
  <img src="file:///${path.join(ROOT, '..', 'brand', 'logo', 'png', 'mark-light-1024.png').replace(/\\/g, '/')}" style="width:250px;height:250px">
</div>`);

// article cover 5:2
add('article-cover', 1600, 640, `<div class="frame wash-tl">${brand('left:72px;top:56px')}${url('right:72px;top:66px')}
  <div class="serif" style="position:absolute;left:72px;top:170px;font-size:84px;width:1250px">Your agent can sign anything.<br><span class="it">We made it check first.</span></div>
  <div style="position:absolute;left:72px;bottom:64px;display:flex;gap:14px">
    <div class="pill" style="font-size:22px;padding:14px 22px"><span class="m">$</span>npm install veralayer</div>
  </div>
</div>`);

const browser = await chromium.launch({ channel: 'chrome' });

// live screenshots from the running site
async function shoot() {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto(SITE + '/', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Flagged wallet' }).click();
  await p.getByText('Blocked.').waitFor({ timeout: 60000 });
  await p.waitForTimeout(600);
  const decision = p.locator('[aria-live="polite"]');
  await decision.screenshot({ path: path.join(SHOTS, 'sim-blocked.png') });
  // a stored result for the public result page
  const r = await (await fetch(SITE + '/v1/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: '293BG8kFBPnNLfmFzcfExfaQfKFiAToYm3RCENiyffYy' }) })).json();
  await p.setViewportSize({ width: 760, height: 1000 });
  await p.goto(`${SITE}/a/${r.id}`, { waitUntil: 'networkidle' });
  await p.getByText('Signature verified in your browser').waitFor({ timeout: 30000 });
  await p.screenshot({ path: path.join(SHOTS, 'result-page.png'), clip: { x: 0, y: 64, width: 760, height: 700 } });
  await p.close();
}
if (!process.argv.includes('--no-shots')) await shoot();

for (const pg of pages) {
  const p = await browser.newPage({ viewport: { width: pg.w, height: pg.h } });
  const file = path.join(ROOT, 'build', `${pg.name}.html`);
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body style="width:${pg.w}px;height:${pg.h}px">${pg.body}</body>`);
  await p.goto('file:///' + file.replace(/\\/g, '/'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, `${pg.name}.png`) });
  await p.close();
}
await browser.close();
console.log(`rendered ${pages.length} images to images/`);
