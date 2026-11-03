// Vera avatar, round 3 (the approved recipe): an ABSTRACT soft white mark on a generated gradient, and 3D renders.
// Seedream v4 backgrounds ($0.03), nano-banana marks and renders ($0.039), composited locally (free).
//   node --env-file=C:/Users/Username/Desktop/checker/.env gen.mjs   → out/*.png + sheet.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(import.meta.url);
const key = process.env.FAL_KEY;

async function fal(model, body) {
  const r = await fetch(`https://fal.run/${model}`, { method: 'POST', headers: { Authorization: `Key ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${model} ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  return j.images.map((i) => i.url);
}
async function save(url, name) {
  const f = path.join(OUT, name);
  fs.writeFileSync(f, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return f;
}

const BG = {
  light: 'abstract smooth gradient of soft blush pink and warm white, a deep red #941900 glow rising from the bottom right corner, subtle fine halftone dot texture, film grain, empty, full-bleed square, no objects, no text',
  dark: 'abstract smooth gradient of near-black and deep wine red, one hot coral #FF6B4A glow in the top right corner, subtle fine halftone dot texture, film grain, empty, full-bleed square, no objects, no text',
};
const MARK = (c) => `one white soft rounded flat 2D abstract mark: ${c}. Centered, about 45% of the width, on a flat pure black background that fills the entire square edge to edge. No frame, no icon container, no border, no text, no letters, no 3D, no shadow, smooth vector-like edges.`;
const MARKS = {
  petals: 'two soft rounded teardrop petals leaning together, touching at the bottom, forming a gentle open v, organic',
  pebble: 'a smooth rounded pebble with a soft v-shaped dent pressed into its top edge, organic',
  liquid: 'two stacked soft rounded chevrons pointing down that melt into each other like liquid, organic',
};
const RENDER = (ground) => `a single abstract sculpture: two smooth rounded petals leaning together into a soft open v, matte white clay material, a thin glowing coral rim light along one edge, ${ground}, soft studio lighting, centered, about 45% of the frame, minimal, no text, no letters`;

const jobs = [
  ...Object.entries(BG).map(([k, p]) => () => fal('fal-ai/bytedance/seedream/v4/text-to-image', { prompt: p, image_size: 'square_hd', num_images: 1 }).then((u) => save(u[0], `bg-${k}.png`))),
  ...Object.entries(MARKS).map(([k, c]) => () => fal('fal-ai/nano-banana', { prompt: MARK(c), num_images: 3 }).then((us) => Promise.all(us.map((u, i) => save(u, `mark-${k}-${i + 1}.png`))))),
  () => fal('fal-ai/nano-banana', { prompt: RENDER('on a pure black background'), num_images: 2 }).then((us) => Promise.all(us.map((u, i) => save(u, `3d-dark-${i + 1}.png`)))),
  () => fal('fal-ai/nano-banana', { prompt: RENDER('on a soft blush pink background'), num_images: 2 }).then((us) => Promise.all(us.map((u, i) => save(u, `3d-light-${i + 1}.png`)))),
];
for (let i = 0; i < jobs.length; i += 3) {
  const res = await Promise.allSettled(jobs.slice(i, i + 3).map((j) => j()));
  res.filter((r) => r.status === 'rejected').forEach((r) => console.error(String(r.reason).slice(0, 200)));
}

// composite: each white-on-black mark over each background with screen blending (black drops out)
const files = fs.readdirSync(OUT);
const marks = files.filter((f) => f.startsWith('mark-'));
const bgs = files.filter((f) => f.startsWith('bg-'));
const renders = files.filter((f) => f.startsWith('3d-'));
const url = (f) => 'file:///' + path.join(OUT, f).split(path.sep).join('/');
const combo = (m, b) => `<figure><div class="a" style="background:url(${url(b)}) center/cover"><img src="${url(m)}" style="mix-blend-mode:screen"></div><div class="s" style="background:url(${url(b)}) center/cover"><img src="${url(m)}" style="mix-blend-mode:screen"></div><figcaption>${m.replace('.png', '')} · ${b.replace('.png', '')}</figcaption></figure>`;
const solo = (f) => `<figure><div class="a"><img src="${url(f)}"></div><div class="s"><img src="${url(f)}"></div><figcaption>${f.replace('.png', '')}</figcaption></figure>`;
const cells = [...renders.map(solo), ...marks.flatMap((m) => bgs.map((b) => combo(m, b)))].join('');
const html = `<!doctype html><style>body{margin:0;padding:28px;font-family:system-ui;background:#fff;width:1500px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:14px;display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:end}
.a{width:180px;height:180px;border-radius:50%;overflow:hidden;position:relative}.a img{width:100%;height:100%;object-fit:cover;display:block}
.s{width:32px;height:32px;border-radius:50%;overflow:hidden}.s img{width:100%;height:100%;object-fit:cover;display:block}
figcaption{grid-column:1/-1;font-size:13px;color:#292524;font-weight:600}</style><div class="g">${cells}</div>`;
fs.writeFileSync(path.join(ROOT, 'sheet.html'), html);
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1556, height: 900 } });
await p.goto(url('../sheet.html').replace('/out/../', '/'));
await p.waitForTimeout(1500);
await p.screenshot({ path: path.join(ROOT, 'sheet.png'), fullPage: true });
await b.close();
console.log(`renders ${renders.length}, marks ${marks.length}, bgs ${bgs.length}`);
