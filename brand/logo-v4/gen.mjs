// Vera lettermark "V" with Ideogram v3 (best fal model for letters/logos). → out/*.png + sheet.png
//   node --env-file=C:/Users/Username/Desktop/checker/.env gen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(import.meta.url);
const key = process.env.FAL_KEY;
const TAIL = 'logo mark only, the letter V and nothing else, no other letters, no words, no tagline, flat vector, centered, generous margin, crisp edges, no mockup, no gradient, no shadow';
const SETS = {
  bold: `a bold modern geometric letter V lettermark, white on a solid deep red #941900 square background, ${TAIL}`,
  light: `a bold modern geometric letter V lettermark in deep red #941900 on a plain off-white background, ${TAIL}`,
  layers: `a letter V lettermark split by one thin horizontal gap into two stacked layers, white on a solid deep red #941900 background, ${TAIL}`,
  serif: `an elegant high-contrast italic serif letter V lettermark, like a modern editorial typeface, deep red #941900 on a plain off-white background, ${TAIL}`,
  mono: `a minimal monoline letter V lettermark with rounded stroke ends, even thick stroke, white on a solid deep red #941900 background, ${TAIL}`,
  duo: `a letter V lettermark made of two separate strokes, left stroke black, right stroke deep red #941900, on a plain off-white background, ${TAIL}`,
};
async function gen(name, prompt) {
  const r = await fetch('https://fal.run/fal-ai/ideogram/v3', { method: 'POST', headers: { Authorization: `Key ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, style: 'DESIGN', rendering_speed: 'BALANCED', num_images: 2, image_size: 'square_hd' }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${name} ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  await Promise.all(j.images.map(async (im, i) => fs.writeFileSync(path.join(OUT, `${name}-${i + 1}.png`), Buffer.from(await (await fetch(im.url)).arrayBuffer()))));
  console.log('✓', name);
}
const entries = Object.entries(SETS);
for (let i = 0; i < entries.length; i += 3) {
  const res = await Promise.allSettled(entries.slice(i, i + 3).map(([n, p]) => gen(n, p)));
  res.filter((r) => r.status === 'rejected').forEach((r) => console.error(String(r.reason)));
}
const files = fs.readdirSync(OUT).sort();
const url = (f) => 'file:///' + path.join(OUT, f).split(path.sep).join('/');
const cells = files.map((f) => `<figure><div class="a"><img src="${url(f)}"></div><div class="s"><img src="${url(f)}"></div><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
fs.writeFileSync(path.join(ROOT, 'sheet.html'), `<!doctype html><style>body{margin:0;padding:28px;font-family:system-ui;background:#fff;width:1500px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:14px;display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:end}.a{width:200px;height:200px;border-radius:50%;overflow:hidden;border:1px solid #eee}.a img,.s img{width:100%;height:100%;object-fit:cover;display:block}.s{width:32px;height:32px;border-radius:50%;overflow:hidden;border:1px solid #eee}figcaption{grid-column:1/-1;font-size:14px;font-weight:600;color:#292524}</style><div class="g">${cells}</div>`);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1556, height: 900 } });
await p.goto(url('../sheet.html').replace('/out/../', '/')); await p.waitForTimeout(1200);
await p.screenshot({ path: path.join(ROOT, 'sheet.png'), fullPage: true }); await b.close();
console.log(files.length, 'marks');
