import Since from '@/components/Since';
import Code from '@/components/Code';

export const metadata = { title: 'Solana Agent Kit · Docs' };

export default function Page() {
  return (
    <>
      <h1>Solana Agent Kit</h1>
      <Since v="0.2.0" />
      <p className="lead">A plugin for Solana Agent Kit v2. It adds two actions your LLM can call and three methods you can call from code.</p>

      <Code label="terminal">{`npm install veralayer zod solana-agent-kit`}</Code>
      <Code label="agent.ts">{`import { SolanaAgentKit } from 'solana-agent-kit';
import { createVeraPlugin } from 'veralayer/agent-kit';

const agent = new SolanaAgentKit(wallet, RPC_URL, {})
  .use(createVeraPlugin({ policy: { minTier: 'medium', tierLimitsSol: { medium: 5 } } }));

await agent.methods.veraCheck(address);             // score + reasons
await agent.methods.veraGuardPayment(address, 2);   // Decision: { action, findings, outflows, … }
await agent.methods.veraRequire(address, 'high');   // throws below the tier`}</Code>

      <h2>Actions</h2>
      <div className="table-wrap"><table><thead><tr><th>Action</th><th>Input</th><th>Use</th></tr></thead><tbody>
        <tr><td><code>VERA_TRUST_CHECK</code></td><td><code>address</code></td><td>Score a counterparty before paying it</td></tr>
        <tr><td><code>VERA_GUARD_PAYMENT</code></td><td><code>to</code>, <code>amountSol</code></td><td>Check a planned payment against the plugin’s policy</td></tr>
      </tbody></table></div>
      <p>Both actions are picked up by the kit’s LangChain, Vercel AI and OpenAI tool adapters.</p>
    </>
  );
}
