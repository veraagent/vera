// AI logo candidates for Vera via fal Recraft v3 (vector). Method: tek/refs/ai6/LOGO_PROMPTS.md — meaning first, then one shape.
// Vera = "checks every payment before your agent signs". Images: checkpoint/gate, keyhole, seal, check merged with a v.
//   node --env-file=../../../../../checker/.env gen.mjs   → svg/*.svg + sheet.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TAIL = 'flat vector, single solid white shape on a plain deep brick red (#941900) background, geometric, symmetrical, bold simple silhouette, centered, lots of negative space, no text, no letters, no gradients, no shading, no 3D, no mockup, no outline';
const IDEAS = [
  ['checkv', 'checkmark pictorial mark whose two arms form a lowercase v, one thick stroke with rounded ends, the right arm slightly longer'],
  ['keyhole', 'keyhole pictorial mark: a circle sitting on a v-shaped wedge, cut-out style'],
  ['gate', 'checkpoint gate pictorial mark: an arch with a narrow vertical slot in the middle, a single dot inside the slot'],
  ['seal', 'round seal pictorial mark: a solid disc with a v-shaped notch cut out of its top edge'],
  ['shieldv', 'minimal shield pictorial mark whose lower half is a v, with a single horizontal gap cutting across the middle'],
  ['eye', 'watchful eye pictorial mark made of two arcs meeting at points, with a solid square pupil, geometric'],
];
const N = 2;
const key = process.env.FAL_KEY;
if (!key) throw new Error('FAL_KEY missing');
fs.mkdirSync(path.join(ROOT, 'svg'), { recursive: true });

const out = [];
for (const [name, idea] of IDEAS) {
  await Promise.all(Array.from({ length: N }, async (_, i) => {
    const r = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST', headers: { Authorization: `Key ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: `${idea}, ${TAIL}`, style: 'vector_illustration', image_size: 'square_hd' }),
    });
    const j = await r.json();
    if (!r.ok) { console.error(name, r.status, JSON.stringify(j).slice(0, 200)); return; }
    const svg = await (await fetch(j.images[0].url)).text();
    const f = path.join(ROOT, 'svg', `${name}-${i + 1}.svg`);
    fs.writeFileSync(f, svg);
    out.push({ name: `${name}-${i + 1}`, file: f });
    console.log('✓', name, i + 1);
  }));
}

// contact sheet
out.sort((a, b) => a.name.localeCompare(b.name));
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const cells = out.map((o) => `<figure><div class="a"><img src="file:///${o.file.replace(/\\/g, '/')}"></div><div class="s"><img src="file:///${o.file.replace(/\\/g, '/')}"></div><figcaption>${o.name}</figcaption></figure>`).join('');
const html = `<!doctype html><style>body{margin:0;padding:32px;font-family:system-ui;background:#fff;width:1400px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:18px;display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:end}
.a{width:200px;height:200px;border-radius:50%;overflow:hidden}.a img{width:100%;height:100%;object-fit:cover}
.s{width:32px;height:32px;border-radius:7px;overflow:hidden}.s img{width:100%;height:100%}
figcaption{grid-column:1/-1;font-size:15px;color:#57534E}</style><div class="g">${cells}</div>`;
const hf = path.join(ROOT, 'sheet.html');
fs.writeFileSync(hf, html);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1464, height: 900 } });
await p.goto('file:///' + hf.replace(/\\/g, '/'));
await p.waitForTimeout(800);
await p.screenshot({ path: path.join(ROOT, 'sheet.png'), fullPage: true });
await b.close();
console.log(`sheet.png (${out.length} marks)`);
