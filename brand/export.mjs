// SVG -> PNG for every entry in manifest.json (written by build.mjs). Run: node export.mjs
// Each SVG is placed inline in a blank page at the target size and screenshotted, so the embedded fonts render exactly.
// One source SVG can produce several PNG sizes (favicons, app icon). Renderer: Chrome via playwright-core.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './tokens.mjs';

const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT_CORE || 'C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core';
const { chromium } = require(PW);

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const only = process.argv[2]; // optional substring filter

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
let n = 0;
for (const { svg, png, w, h, transparent } of manifest) {
  if (only && !png.includes(only)) continue;
  const src = fs.readFileSync(path.join(ROOT, svg), 'utf8').replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${w}" height="${h}"`);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${src}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, png);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
  n++;
}
await browser.close();
console.log(`exported ${n} png`);
