// quick offline check run before every publish: the public API surface loads and the policy engine works
import { VeraGuard, Vera, evaluatePolicy, inspectTransaction, DEFAULT_POLICY } from '../dist/index.js';
const d = evaluatePolicy({ outflows: [{ kind: 'sol', to: 'x', toAccount: 'x', amount: 1, instruction: 't' }], recipients: [{ address: 'x', ok: true, score: 90, tier: 'high', reasons: [], attestationId: 'i', verified: true, expired: false }] });
if (d.action !== 'allow' || typeof VeraGuard !== 'function' || typeof Vera !== 'function' || typeof inspectTransaction !== 'function' || DEFAULT_POLICY.minTier !== 'medium') throw new Error('smoke test failed');
console.log('smoke ok');
