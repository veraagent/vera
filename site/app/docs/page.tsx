import Code from '@/components/Code';

export const metadata = { title: 'Quickstart · Docs' };

export default function Page() {
  return (
    <>
      <h1>Quickstart</h1>
      <p className="lead">veralayer is a payment guard for AI agents on Solana. Before your agent signs, it decodes the transaction, scores every recipient with Vera and applies your spending policy.</p>

      <h2>Install</h2>
      <Code label="terminal">{`npm install veralayer @solana/web3.js`}</Code>
      <p>Node 18+. <code>@solana/web3.js</code> is only needed for guarding transactions; scoring an address works without it.</p>

      <h2>Score an address</h2>
      <Code label="check.ts">{`import { Vera } from 'veralayer';

const vera = new Vera();
const r = await vera.check('AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51');

r.attestation.score;    // 55
r.attestation.tier;     // 'medium'
r.attestation.reasons;  // [{ kind: 'warn', text: '21 unrecognised programs…' }, …]
await vera.verify(r);   // { valid: true, expired: false }, checked locally`}</Code>

      <h2>Guard your agent’s wallet</h2>
      <p>Swap <code>connection.sendTransaction</code> for <code>guard.sendTransaction</code>. Anything the policy blocks throws before it reaches the network.</p>
      <Code label="agent.ts">{`import { Connection } from '@solana/web3.js';
import { VeraGuard, VeraBlockedError } from 'veralayer';

const guard = new VeraGuard({
  connection: new Connection(process.env.RPC_URL!),
  policy: { minTier: 'medium', dailyLimitSol: 20 },
});

try {
  const { signature } = await guard.sendTransaction(tx, [agentKeypair]);
} catch (e) {
  if (e instanceof VeraBlockedError) console.log(e.decision.findings);
}`}</Code>

      <h2>Try it without code</h2>
      <Code label="terminal">{`npx veralayer check <address>
npx veralayer pay <address> 2.5 --min-tier medium`}</Code>
    </>
  );
}
