// full contact sheet of every candidate in r2/ and r3/ → all.png (avatar circle + 32px favicon + name)
const { chromium } = require('C:/Users/Username/Desktop/tek/.tools/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const files = ['r3', 'r2'].flatMap((d) => fs.readdirSync(path.join(__dirname, d)).map((f) => path.join(__dirname, d, f)));
const url = (f) => 'file:///' + f.split(path.sep).join('/');
const cells = files.map((f) => `<figure><div class="a"><img src="${url(f)}"></div><div class="s"><img src="${url(f)}"></div><figcaption>${path.basename(f, path.extname(f))}</figcaption></figure>`).join('');
const html = `<!doctype html><style>body{margin:0;padding:28px;font-family:system-ui;background:#fff;width:1500px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #E7E5E4;border-radius:18px;padding:14px;display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:end}
.a{width:180px;height:180px;border-radius:50%;overflow:hidden}.a img{width:100%;height:100%;object-fit:cover}
.s{width:32px;height:32px;border-radius:7px;overflow:hidden}.s img{width:100%;height:100%;object-fit:cover}
figcaption{grid-column:1/-1;font-size:15px;color:#292524;font-weight:600}</style><div class="g">${cells}</div>`;
fs.writeFileSync(path.join(__dirname, 'all.html'), html);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1556, height: 900 } });
  await p.goto(url(path.join(__dirname, 'all.html')));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(__dirname, 'all.png'), fullPage: true });
  await b.close();
  console.log(files.length, 'marks');
})();
