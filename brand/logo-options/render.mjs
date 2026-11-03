// Minimal logo options for Vera: one sheet, each mark shown as an X avatar (circle crop), a 32px favicon and with the wordmark.
//   node render.mjs  →  options.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const FONTS = path.join(ROOT, '..', 'fonts').replace(/\\/g, '/');
const BRICK = '#941900', INK = '#0C0A09', BLUSH = '#FFD4D2';

// each mark is an SVG in a 100x100 box; `bg` is the avatar ground
const MARKS = [
  { key: 'A', name: 'Solid v', note: 'brick disc, a geometric lowercase v knocked out', bg: BRICK,
    svg: `<path d="M27 33 L44 70 Q50 82 56 70 L73 33" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` },
  { key: 'B', name: 'Check-v', note: 'one stroke that reads as a v and as a check', bg: '#fff',
    svg: `<path d="M24 47 L44 70 L77 28" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="77" cy="28" r="6.5" fill="${BRICK}"/>` },
  { key: 'C', name: 'Gate', note: 'two posts with a gap: the guard between agent and chain', bg: '#fff',
    svg: `<rect x="29" y="26" width="13" height="48" rx="6.5" fill="${INK}"/><rect x="58" y="26" width="13" height="48" rx="6.5" fill="${BRICK}"/>` },
  { key: 'D', name: 'Dot', note: 'a single brick point: checked', bg: '#fff',
    svg: `<circle cx="50" cy="50" r="22" fill="${BRICK}"/>` },
  { key: 'E', name: 'Split', note: 'allow / block: a circle cut once', bg: '#fff',
    svg: `<path d="M50 24 A26 26 0 0 0 50 76 Z" fill="${INK}"/><path d="M50 24 A26 26 0 0 1 50 76 Z" fill="${BRICK}"/>` },
  { key: 'F', name: 'Serif v', note: 'the italic v from the wordmark, alone', bg: BLUSH,
    svg: `<text x="50" y="69" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="700" font-size="72" fill="${BRICK}">v</text>` },
];

const tile = (m) => `
<div class="tile">
  <div class="row">
    <div class="avatar" style="background:${m.bg}"><svg viewBox="0 0 100 100" width="200" height="200">${m.svg}</svg></div>
    <div class="small">
      <div class="fav" style="background:${m.bg}"><svg viewBox="0 0 100 100" width="32" height="32">${m.svg}</svg></div>
      <div class="cap">32px</div>
    </div>
  </div>
  <div class="lock"><span class="lm" style="background:${m.bg}"><svg viewBox="0 0 100 100" width="34" height="34">${m.svg}</svg></span><span class="wm"><i>Vera</i> Agent</span></div>
  <div class="name"><b>${m.key}</b> · ${m.name}</div>
  <div class="note">${m.note}</div>
</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Newsreader;font-weight:200 800;font-style:normal;src:url(file:///${FONTS}/Newsreader.woff2)}
@font-face{font-family:Newsreader;font-weight:200 800;font-style:italic;src:url(file:///${FONTS}/Newsreader-italic.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(file:///${FONTS}/Montserrat.woff2)}
*{box-sizing:border-box;margin:0}body{font-family:Montserrat;background:#fff;padding:48px;width:1500px}
h1{font-family:Newsreader;font-weight:500;font-size:44px;letter-spacing:-.02em}h1 i{color:${BRICK};font-weight:700}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:32px}
.tile{border:1.5px solid #E7E5E4;border-radius:24px;padding:28px}
.row{display:flex;align-items:flex-end;gap:28px}
.avatar{width:200px;height:200px;border-radius:50%;display:grid;place-items:center;border:1.5px solid #E7E5E4;overflow:hidden}
.small{display:flex;flex-direction:column;align-items:center;gap:8px}
.fav{width:32px;height:32px;border-radius:7px;display:grid;place-items:center;border:1px solid #E7E5E4;overflow:hidden}
.cap{font-size:11px;color:#78716C}
.lock{display:flex;align-items:center;gap:10px;margin-top:24px}
.lm{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;overflow:hidden;border:1px solid #E7E5E4}
.wm{font-family:Newsreader;font-size:26px;letter-spacing:-.02em}.wm i{color:${BRICK};font-weight:700}
.name{margin-top:18px;font-size:17px}.name b{color:${BRICK}}
.note{margin-top:4px;font-size:14px;color:#57534E}
</style><body><h1>Vera mark: <i>minimal</i> options</h1><div class="grid">${MARKS.map(tile).join('')}</div></body>`;

const file = path.join(ROOT, 'options.html');
fs.writeFileSync(file, html);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1596, height: 900 } });
await p.goto('file:///' + file.replace(/\\/g, '/'));
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(ROOT, 'options.png'), fullPage: true });
await b.close();
fs.writeFileSync(path.join(ROOT, 'marks.json'), JSON.stringify(MARKS, null, 1));
console.log('options.png');
