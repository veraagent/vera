// npm run check -- <address> [--features]
import { check } from '../../site/lib/engine/index';

const [address, ...flags] = process.argv.slice(2);
if (!address) { console.error('usage: npm run check -- <solana address> [--features]'); process.exit(1); }
const t = Date.now();
const r = await check(address, { fresh: true });
const { features, ...rest } = r;
console.log(JSON.stringify(flags.includes('--features') ? r : rest, null, 2));
console.error(`\n${r.attestation.score ?? '—'} · ${r.attestation.tier} · ${r.attestation.method} · ${((Date.now() - t) / 1000).toFixed(1)}s`);
void features;
