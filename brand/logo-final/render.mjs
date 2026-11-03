// Final Vera mark (traced serif V) → avatar, favicons, apple icon, lockups, OG image.
//   node render.mjs   (after python trace.py)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(import.meta.url);
const FONTS = path.join(ROOT, '..', 'fonts').split(path.sep).join('/');
const CREAM = '#F6F1EA', BRICK = '#941900';

const raw = fs.readFileSync(path.join(ROOT, 'v.svg'), 'utf8');
const [, vw, vh] = raw.match(/viewBox="0 0 (\d+) (\d+)"/);
const d = raw.match(/ d="([^"]+)"/)[1];
// the mark as a reusable inner svg, scaled to `size` px tall (keeps aspect), any fill
const mark = (size, fill = BRICK) => `<svg viewBox="0 0 ${vw} ${vh}" height="${size}" width="${(size * vw) / vh}"><path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>`;

// standalone SVG files for the site and brand
const tile = (n, fill, bg, scale = 0.56, radius = 0.22) => {
  const h = n * scale, w = (h * vw) / vh;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${n * radius}" fill="${bg}"/><g transform="translate(${(n - w) / 2} ${(n - h) / 2 + n * 0.03}) scale(${h / vh})"><path fill="${fill}" fill-rule="evenodd" d="${d}"/></g></svg>`;
};
fs.writeFileSync(path.join(OUT, 'v-mark.svg'), raw.replace(/width="\d+" height="\d+"/, ''));
fs.writeFileSync(path.join(OUT, 'icon.svg'), tile(100, BRICK, CREAM, 0.6));

const CSS = `@font-face{font-family:Newsreader;font-weight:200 800;font-style:normal;src:url(file:///${FONTS}/Newsreader.woff2)}
@font-face{font-family:Newsreader;font-weight:200 800;font-style:italic;src:url(file:///${FONTS}/Newsreader-italic.woff2)}
@font-face{font-family:JBM;font-weight:100 800;src:url(file:///${FONTS}/JetBrainsMono.woff2)}
*{margin:0;box-sizing:border-box}body{overflow:hidden}`;
const center = (bg, inner) => `<div style="width:100%;height:100%;background:${bg};display:grid;place-items:center">${inner}</div>`;
const pages = [
  ['x-avatar.png', 400, 400, center(CREAM, `<div style="margin-top:14px">${mark(196)}</div>`)],
  ['favicon-16.png', 16, 16, center(CREAM, mark(11))],
  ['favicon-32.png', 32, 32, center(CREAM, mark(21))],
  ['favicon-48.png', 48, 48, center(CREAM, mark(31))],
  ['apple-touch-icon.png', 180, 180, center(CREAM, `<div style="margin-top:6px">${mark(104)}</div>`)],
  ['mark-512.png', 512, 512, center('transparent', mark(400))],
  ['lockup.png', 1200, 300, center('transparent', `<div style="display:flex;align-items:center;gap:34px">${mark(170)}<span style="font-family:Newsreader;font-size:150px;letter-spacing:-.025em;line-height:1"><i style="font-weight:700;color:${BRICK}">Vera</i> Agent</span></div>`)],
  ['og.png', 1200, 630, `<div style="width:100%;height:100%;background:radial-gradient(900px 600px at 0% 0%,#FFD4D2 0,#fff 70%);position:relative;font-family:Newsreader">
     <div style="position:absolute;left:80px;top:78px;display:flex;align-items:center;gap:18px">${mark(58)}<span style="font-size:44px;letter-spacing:-.02em"><i style="font-weight:700;color:${BRICK}">Vera</i> Agent</span></div>
     <div style="position:absolute;left:80px;top:230px;font-size:84px;font-weight:500;letter-spacing:-.025em;line-height:1.02">Your agent signs.<br><i style="font-weight:700;color:${BRICK}">Vera checks first.</i></div>
     <div style="position:absolute;left:80px;bottom:74px;font-family:JBM;font-size:26px;border:1.5px solid #E7E5E4;border-radius:14px;padding:14px 22px;background:#fff">$ npm install veralayer</div>
     <div style="position:absolute;right:80px;bottom:88px;font-family:system-ui;font-weight:600;font-size:22px;color:#57534E">veraagent.io</div></div>`],
];

const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, w, h, body] of pages) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const f = path.join(OUT, name.replace('.png', '.html'));
  fs.writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body style="width:${w}px;height:${h}px">${body}</body>`);
  await p.goto('file:///' + f.split(path.sep).join('/'));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, name), omitBackground: !body.includes('background:') || body.startsWith(center('transparent', '').slice(0, 40)) });
  await p.close();
  fs.unlinkSync(f);
}
await b.close();
console.log('rendered', pages.length, 'assets + v-mark.svg + icon.svg');
