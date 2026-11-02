// Builds every Vera brand SVG from tokens.mjs + marks.mjs and writes manifest.json for export.mjs.
//   node build.mjs && node export.mjs
// Style source: veralayer.io (white + blush washes, Newsreader serif with italic brick accents, Montserrat UI, Poppins wordmark).
// Text and glyphs are measured in Chrome with the real fonts, so lockups sit exactly.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, color as C, font as F, fontFaceCss, contrast } from './tokens.mjs';
import { svg, esc, monogram, blush } from './marks.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');

const manifest = [];
function out(file, markup, exports = []) {
  const p = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, markup);
  for (const e of exports) manifest.push({ svg: file, ...e });
}
const FONTS = fontFaceCss();
// old outputs from the previous (dark) direction are removed so nothing stale survives
for (const d of ['logo', 'icons', 'palette', 'og']) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
for (const f of fs.existsSync(path.join(ROOT, 'x')) ? fs.readdirSync(path.join(ROOT, 'x')) : []) if (/\.(svg|png)$/.test(f)) fs.rmSync(path.join(ROOT, 'x', f));

// ---- measuring (Chrome, real fonts) ----
const browser = await chromium.launch({ channel: 'chrome' });
const mp = await browser.newPage();
await mp.setContent(`<style>${FONTS}</style><span id="m" style="white-space:pre"></span><canvas id="c"></canvas>`);
await mp.evaluate(async () => { for (const f of ['700 italic 100px Newsreader', '500 100px Newsreader', '400 100px Montserrat', '700 100px Poppins', '400 100px "JetBrains Mono"']) await document.fonts.load(f); });
// advance width of a run; style = 'italic' | 'normal'
async function textW(text, family, weight, size, { ls = 0, style = 'normal' } = {}) {
  return mp.evaluate(([t, f, w, s, l, st]) => {
    const el = document.getElementById('m');
    el.style.font = `${st} ${w} ${s}px ${f}`; el.style.letterSpacing = l + 'px'; el.textContent = t;
    return el.getBoundingClientRect().width;
  }, [text, family, weight, size, ls, style]);
}
// ink box of a glyph run at size 100, relative to the text origin
async function inkBox(text, fontCss) {
  return mp.evaluate(([t, f]) => {
    const g = document.getElementById('c').getContext('2d'); g.font = f; const m = g.measureText(t);
    return { x: -m.actualBoundingBoxLeft, y: -m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
  }, [text, fontCss]);
}
const VBOX = await inkBox('V', "italic 700 100px Newsreader");

// ===== marks =====
// ring = a score ring (the 51% ring motif on veralayer.io), 87% filled from 12 o'clock
const ring = (cx, cy, r, sw, arc, track, pct = 87) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${arc}" stroke-width="${sw}" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100" transform="rotate(-90 ${cx} ${cy})"/>`;
// final mark (100x100): italic V inside a score ring
const markRing = (t) => ring(50, 50, 44, 5, t.arc, t.track) + monogram(50, 51, 66, VBOX, t.v);
// favicon/small mark: V alone on a blush tile
const tile = (t, rx = 22) => `<rect width="100" height="100" rx="${rx}" fill="${t.tile}"/>` + monogram(50, 51, 84, VBOX, t.v);

// ===== 1. logo concepts (kept for the record) =====
const L = { v: C.brick, arc: C.brick, track: C.stone200, tile: C.blush, word: C.ink, sub: C.stone500 };
out('logo/concepts/concept-a-monogram.svg', svg(400, 400, `<rect width="400" height="400" fill="#fff"/><g transform="translate(80 80) scale(2.4)">${tile(L)}</g>`, { style: FONTS }), [{ png: 'logo/concepts/concept-a-monogram.png', w: 400, h: 400 }]);
{
  const w1 = await textW('Vera', F.serif, 700, 120, { style: 'italic' });
  const s = `<rect width="400" height="400" fill="#fff"/><text x="${(400 - w1 - 26) / 2}" y="240" font-family="${F.serif}" font-style="italic" font-weight="700" font-size="120" fill="${C.ink}">Vera<tspan fill="${C.coral}">.</tspan></text>`;
  out('logo/concepts/concept-b-wordmark.svg', svg(400, 400, s, { style: FONTS }), [{ png: 'logo/concepts/concept-b-wordmark.png', w: 400, h: 400 }]);
}
out('logo/concepts/concept-c-ring.svg', svg(400, 400, `<rect width="400" height="400" fill="#fff"/><g transform="translate(80 80) scale(2.4)">${markRing(L)}</g>`, { style: FONTS }), [{ png: 'logo/concepts/concept-c-ring.png', w: 400, h: 400 }]);

// ===== 2. final logo set =====
const themes = {
  light: { v: C.brick, arc: C.brick, track: C.stone200, tile: C.blush, word: C.ink, vera: C.brick, sub: C.stone500 },
  dark: { v: C.coral, arc: C.coral, track: '#2A2523', tile: C.stone900, word: '#FFFFFF', vera: C.coral, sub: C.stone400 },
  'mono-black': { v: '#000', arc: '#000', track: '#00000022', tile: 'none', word: '#000', vera: '#000', sub: '#000' },
  'mono-white': { v: '#fff', arc: '#fff', track: '#FFFFFF33', tile: 'none', word: '#fff', vera: '#fff', sub: '#fff' },
};
// wordmark: "Vera" italic 700 brick + "Agent" upright 500, Newsreader 72 (same pairing as the veralayer.io H1)
const WS = 72, WT = -1.8;
const wVera = await textW('Vera', F.serif, 700, WS, { ls: WT, style: 'italic' });
const wSp = await textW(' ', F.serif, 500, WS, { ls: WT });
const wAgent = await textW('Agent', F.serif, 500, WS, { ls: WT });
const wordW = Math.ceil(wVera + wSp + wAgent);
const word = (x, y, t) => `<text x="${x}" y="${y}" font-family="${F.serif}" font-size="${WS}" letter-spacing="${WT}"><tspan font-style="italic" font-weight="700" fill="${t.vera}">Vera</tspan><tspan font-weight="500" fill="${t.word}"> Agent</tspan></text>`;
// endorsement line: "by VeraLayer" (VeraLayer in their Poppins 700 wordmark style)
const byW = await textW('by ', F.sans, 500, 20), vlW = await textW('VeraLayer', F.logo, 700, 22, { ls: -1.1 });
const endorse = (x, y, t) => `<text x="${x}" y="${y}" font-family="${F.sans}" font-weight="500" font-size="20" fill="${t.sub}">by </text><text x="${x + byW}" y="${y}" font-family="${F.logo}" font-weight="700" font-size="22" letter-spacing="-1.1" fill="${t.word}">VeraLayer</text>`;
const appBg = { light: '#FFFFFF', dark: C.night };

for (const [name, t] of Object.entries(themes)) {
  out(`logo/mark-${name}.svg`, svg(512, 512, markRing(t), { viewBox: '0 0 100 100', style: FONTS }), [
    { png: `logo/png/mark-${name}-512.png`, w: 512, h: 512, transparent: true },
    { png: `logo/png/mark-${name}-1024.png`, w: 1024, h: 1024, transparent: true },
  ]);
  const ww = wordW + 12, wh = 96;
  out(`logo/wordmark-${name}.svg`, svg(ww, wh, word(4, 70, t), { style: FONTS }), [{ png: `logo/png/wordmark-${name}.png`, w: ww * 3, h: wh * 3, transparent: true }]);
  // full lockup: ring mark + wordmark + endorsement
  const fw = 120 + 22 + Math.max(wordW, byW + vlW) + 12, fh = 120;
  const full = `<g transform="scale(1.2)">${markRing(t)}</g>${word(142, 66, t)}${endorse(146, 104, t)}`;
  out(`logo/full-${name}.svg`, svg(fw, fh, full, { style: FONTS }), [{ png: `logo/png/full-${name}.png`, w: fw * 3, h: fh * 3, transparent: true }]);
}

// ===== 3. icons =====
const appIcon = `<defs><clipPath id="ar"><rect width="512" height="512" rx="114"/></clipPath></defs>
<g clip-path="url(#ar)">${blush(512, 512, { at: [0, 0], r: 1.05 })}</g>
<rect x="1" y="1" width="510" height="510" rx="113" fill="none" stroke="${C.stone200}" stroke-width="2"/>
<g transform="translate(76 76) scale(3.6)">${markRing(themes.light)}</g>`;
out('icons/app-icon.svg', svg(512, 512, appIcon, { style: FONTS }), [{ png: 'icons/app-icon-512.png', w: 512, h: 512, transparent: true }]);
out('icons/favicon.svg', svg(48, 48, tile(themes.light), { viewBox: '0 0 100 100', style: FONTS }), [16, 32, 48, 180].map((s) => ({ png: `icons/favicon-${s}.png`, w: s, h: s, transparent: true })));

// ===== 4. palette sheet =====
const sw = [
  ['paper', 'Paper'], ['blush', 'Blush wash'], ['blushSoft', 'Blush soft'], ['ink', 'Ink'], ['stone500', 'Body'], ['stone200', 'Hairline'],
  ['brick', 'Brick (signature)'], ['coral', 'Coral'], ['night', 'Night section'], ['high', 'Tier: high'], ['medium', 'Tier: medium'], ['low', 'Tier: low'],
];
let pal = `<rect width="1200" height="700" fill="#fff"/>${blush(1200, 700, { at: [1, 0], r: 0.6 })}
<text x="60" y="96" font-family="${F.serif}" font-weight="500" font-size="48" fill="${C.ink}">Vera <tspan font-style="italic" font-weight="700" fill="${C.brick}">palette</tspan></text>`;
sw.forEach(([k, label], i) => {
  const x = 60 + (i % 6) * 182, y = 150 + Math.floor(i / 6) * 260;
  const on = ['paper', 'blush', 'blushSoft', 'stone200'].includes(k) ? `ink ${contrast(C.ink, C[k]).toFixed(1)}` : k === 'night' ? `white ${contrast('#FFFFFF', C[k]).toFixed(1)}` : `on white ${contrast(C[k], '#FFFFFF').toFixed(1)}`;
  pal += `<rect x="${x}" y="${y}" width="162" height="150" rx="24" fill="${C[k]}" stroke="${C.stone200}"/>
<text x="${x}" y="${y + 184}" font-family="${F.sans}" font-weight="700" font-size="16" fill="${C.ink}">${esc(label)}</text>
<text x="${x}" y="${y + 208}" font-family="${F.mono}" font-size="15" fill="${C.stone500}">${C[k]}</text>
<text x="${x}" y="${y + 230}" font-family="${F.mono}" font-size="13" fill="${C.stone500}">${on}:1</text>`;
});
out('palette/palette.svg', svg(1200, 700, pal, { style: FONTS }), [{ png: 'palette/palette.png', w: 1200, h: 700 }]);

const pairs = [
  ['ink', 'paper'], ['stone500', 'paper'], ['stone600', 'paper'], ['brick', 'paper'], ['brick', 'blush'], ['ink', 'blush'], ['stone500', 'blushSoft'],
  ['high', 'paper'], ['medium', 'paper'], ['low', 'paper'], ['unknown', 'paper'],
  ['paper', 'ink'], ['paper', 'brick'], ['paper', 'night'], ['coral', 'night'], ['stone400', 'night'], ['highOnDark', 'night'], ['mediumOnDark', 'night'], ['lowOnDark', 'night'],
];
fs.writeFileSync(path.join(ROOT, 'palette/contrast.json'), JSON.stringify(pairs.map(([a, b]) => ({ fg: a, bg: b, fgHex: C[a], bgHex: C[b], ratio: +contrast(C[a], C[b]).toFixed(2) })), null, 1));

// ===== 5. X creatives + OG (x.mjs) =====
const { buildX } = await import('./x.mjs');
await buildX({ out, FONTS, textW, markRing, tile, themes, word, endorse, wordW });

await browser.close();
fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`built ${new Set(manifest.map((m) => m.svg)).size} svg, ${manifest.length} exports`);
