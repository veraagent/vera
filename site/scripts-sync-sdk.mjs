// Copies the browser-safe parts of the veraagent package (client + policy) into lib/veraagent/.
// The site deploys without the rest of the repo, so it carries its own copy. Run: npm run sync-sdk
import fs from 'node:fs';
fs.mkdirSync(new URL('./lib/veraagent/', import.meta.url), { recursive: true });
for (const f of ['client', 'policy']) {
  const src = fs.readFileSync(new URL(`../veraagent/src/${f}.ts`, import.meta.url), 'utf8').replace(/from '\.\/(\w+)\.js'/g, "from './$1'");
  fs.writeFileSync(new URL(`./lib/veraagent/${f}.ts`, import.meta.url), `// GENERATED from ../veraagent/src/${f}.ts by \`npm run sync-sdk\`. Do not edit here.\n` + src);
}
console.log('lib/veraagent synced');
