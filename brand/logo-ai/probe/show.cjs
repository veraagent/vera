// side-by-side render of every SVG in this folder → probe.png
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
const url = (f) => 'file:///' + path.join(dir, f).split(path.sep).join('/');
const html = `<body style="margin:0;display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#fff">${files.map((f) => `<div style="text-align:center;font:13px system-ui"><img src="${url(f)}" width="280" height="280"><br>${f}</div>`).join('')}</body>`;
fs.writeFileSync(path.join(dir, 'p.html'), html);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1220, height: 340 } });
  await p.goto(url('p.html'));
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(dir, 'probe.png'), fullPage: true });
  await b.close();
})();
