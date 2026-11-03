// Round 2: stricter minimal prompts (no "brick" — Recraft drew bricks), two models.
//   node --env-file=C:/Users/Username/Desktop/checker/.env gen2.mjs   → r2/*.svg|png + sheet2.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT = path.join(ROOT, 'r2');
fs.mkdirSync(OUT, { recursive: true });
const TAIL = 'flat vector logo mark, one solid white shape on a plain solid dark red #941900 background, perfectly flat, geometric, bold, minimal like the Apple or Nike logo, centered, generous negative space, no text, no letters, no gradient, no shadow, no texture, no pattern, no border, no illustration';
const IDEAS = [
  ['checkv', 'a single thick checkmark whose two arms form a lowercase letter v, rounded stroke ends'],
  ['layers', 'two stacked chevrons pointing down, like a layered letter v, equal thickness, small gap between them'],
  ['keyhole', 'a keyhole made of a circle above a downward v-shaped wedge'],
  ['notch', 'a solid circle with a v-shaped notch cut out of the top'],
  ['split', 'a circle split vertically into two halves with a thin gap between them'],
  ['shield', 'a simple shield silhouette with a v-shaped cut-out in the middle'],
];
const key = process.env.FAL_KEY;
const call = async (model, body) => {
  const r = await fetch(`https://fal.run/${model}`, { method: 'POST', headers: { Authorization: `Key ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${model} ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  return j.images[0].url;
};
const save = async (url, base) => {
  const ext = url.split('?')[0].endsWith('.svg') ? 'svg' : 'png';
  const f = path.join(OUT, `${base}.${ext}`);
  fs.writeFileSync(f, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return f;
};
const jobs = [];
for (const [name, idea] of IDEAS) {
  const prompt = `${idea}, ${TAIL}`;
  for (const i of [1, 2]) jobs.push(call('fal-ai/recraft/v3/text-to-image', { prompt, style: 'vector_illustration', image_size: 'square_hd' }).then((u) => save(u, `${name}-recraft${i}`)));
  jobs.push(call('fal-ai/nano-banana-pro', { prompt, num_images: 1, aspect_ratio: '1:1' }).then((u) => save(u, `${name}-nano`)));
}
const res = await Promise.allSettled(jobs);
const files = res.filter((r) => r.status === 'fulfilled').map((r) => r.value).sort();
res.filter((r) => r.status === 'rejected').forEach((r) => console.error(String(r.reason).slice(0, 200)));

const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const url = (f) => 'file:///' + f.split(path.sep).join('/');
const cells = files.map((f) => `<figure><div class="a"><img src="${url(f)}"></div><div class="s"><img src="${url(f)}"></div><figcaption>${path.basename(f)}</figcaption></figure>`).join('');
const html = `<!doctype html><style>body{margin:0;padding:28px;font-family:system-ui;background:#fff;width:1500px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:16px;display:grid;grid-template-columns:220px 1fr;gap:14px;align-items:end}
.a{width:220px;height:220px;border-radius:50%;overflow:hidden}.a img{width:100%;height:100%;object-fit:cover}
.s{width:32px;height:32px;border-radius:7px;overflow:hidden}.s img{width:100%;height:100%;object-fit:cover}
figcaption{grid-column:1/-1;font-size:14px;color:#57534E}</style><div class="g">${cells}</div>`;
fs.writeFileSync(path.join(ROOT, 'sheet2.html'), html);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1556, height: 900 } });
await p.goto(url(path.join(ROOT, 'sheet2.html')));
await p.waitForTimeout(1200);
await p.screenshot({ path: path.join(ROOT, 'sheet2.png'), fullPage: true });
await b.close();
console.log(`sheet2.png (${files.length})`);
