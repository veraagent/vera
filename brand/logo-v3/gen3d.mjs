// more 3D directions (nano-banana, $0.039 each) + a sheet of every 3D render
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const require = createRequire(import.meta.url);
const key = process.env.FAL_KEY;
const fal = async (prompt, n) => {
  const r = await fetch('https://fal.run/fal-ai/nano-banana', { method: 'POST', headers: { Authorization: `Key ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt, num_images: n }) });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 160)); return j.images.map((i) => i.url);
};
const save = async (u, n) => fs.writeFileSync(path.join(OUT, n), Buffer.from(await (await fetch(u)).arrayBuffer()));
const R = (form, ground, rim) => `a single abstract sculpture: ${form}, matte white ceramic material, ${rim}, ${ground}, soft studio lighting, centered, about 45% of the frame, minimal, premium product render, no text, no letters`;
const SETS = {
  'pebble-dark': R('a smooth rounded pebble with a soft v-shaped dent pressed into its top', 'on a pure black background', 'a thin glowing coral rim light along one edge'),
  'chevron-dark': R('two stacked soft rounded chevrons pointing down, slightly melted into each other', 'on a pure black background', 'a thin glowing coral rim light along one edge'),
  'petals-blush': R('two smooth rounded petals leaning together into a soft open v', 'on a smooth blush pink to deep red gradient background', 'a soft warm glow behind it'),
  'petals-red': R('two smooth rounded petals leaning together into a soft open v', 'on a deep dark red background', 'a thin glowing white rim light along one edge'),
};
await Promise.all(Object.entries(SETS).map(async ([k, p]) => { const us = await fal(p, 2); await Promise.all(us.map((u, i) => save(u, `3d-${k}-${i + 1}.png`))); console.log('✓', k); }));
const files = fs.readdirSync(OUT).filter((f) => f.startsWith('3d-')).sort();
const url = (f) => 'file:///' + path.join(OUT, f).split(path.sep).join('/');
const cells = files.map((f) => `<figure><div class="a"><img src="${url(f)}"></div><div class="s"><img src="${url(f)}"></div><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
fs.writeFileSync(path.join(ROOT, 'sheet3d.html'), `<!doctype html><style>body{margin:0;padding:28px;font-family:system-ui;background:#fff;width:1500px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:14px;display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:end}.a{width:200px;height:200px;border-radius:50%;overflow:hidden}.a img,.s img{width:100%;height:100%;object-fit:cover;display:block}.s{width:32px;height:32px;border-radius:50%;overflow:hidden}figcaption{grid-column:1/-1;font-size:14px;font-weight:600;color:#292524}</style><div class="g">${cells}</div>`);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1556, height: 900 } });
await p.goto('file:///' + path.join(ROOT, 'sheet3d.html').split(path.sep).join('/')); await p.waitForTimeout(1200);
await p.screenshot({ path: path.join(ROOT, 'sheet3d.png'), fullPage: true }); await b.close(); console.log(files.length, '3d renders');
