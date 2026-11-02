// Solana Agent Kit v2 plugin.
//
//   import { SolanaAgentKit } from 'solana-agent-kit';
//   import { createVeraPlugin } from 'veralayer/agent-kit';
//   const agent = new SolanaAgentKit(wallet, rpcUrl, {}).use(createVeraPlugin({ policy: { minTier: 'medium' } }));
//   await agent.methods.veraGuardPayment(to, 1.5);
//
// Types are structural, so this file needs zod but not solana-agent-kit itself.
import { z } from 'zod';
import { Vera, type Tier } from './client.js';
import { VeraGuard } from './guard.js';
import type { Policy } from './policy.js';

type Action = {
  name: string;
  similes: string[];
  description: string;
  examples: { input: Record<string, unknown>; output: Record<string, unknown>; explanation: string }[][];
  schema: z.ZodTypeAny;
  handler: (agent: unknown, input: Record<string, any>) => Promise<Record<string, any>>;
};
type Plugin = { name: string; methods: Record<string, any>; actions: Action[]; initialize(agent: unknown): void };

export function createVeraPlugin(opts: { apiUrl?: string; apiKey?: string; issuer?: string; policy?: Policy } = {}): Plugin {
  const vera = new Vera(opts);
  const guard = new VeraGuard({ vera, policy: opts.policy });

  const check = async (address: string) => {
    const r = await vera.check(address);
    const v = await vera.verify(r);
    const a = r.attestation;
    return { address, score: a.score, tier: a.tier, reasons: a.reasons, summary: r.summary, attestation_id: r.id, signature_valid: v.valid };
  };

  const actions: Action[] = [
    {
      name: 'VERA_TRUST_CHECK',
      similes: ['check counterparty', 'is this address safe to pay', 'trust score', 'vet wallet before payment'],
      description: 'Score a Solana address with Vera before sending it funds: 0-100 score, tier, reasons, and whether the signed result verified.',
      examples: [[{ input: { address: '<counterparty address>' }, output: { status: 'success', score: 55, tier: 'medium' }, explanation: 'Illustrative: score a recipient before paying it' }]],
      schema: z.object({ address: z.string().min(32).max(44) }),
      handler: async (_agent, input) => {
        try { return { status: 'success', ...(await check(String(input.address))) }; }
        catch (e) { return { status: 'error', message: (e as Error).message }; }
      },
    },
    {
      name: 'VERA_GUARD_PAYMENT',
      similes: ['should I pay', 'guard payment', 'check payment against policy'],
      description: 'Decide whether a planned SOL payment may go ahead under the configured spending policy: allow, review or block, with the rule that fired.',
      examples: [[{ input: { to: '<recipient>', amountSol: 1 }, output: { status: 'success', action: 'allow', findings: [] }, explanation: 'Illustrative: gate a 1 SOL payment' }]],
      schema: z.object({ to: z.string().min(32).max(44), amountSol: z.number().positive() }),
      handler: async (_agent, input) => {
        try { const d = await guard.evaluatePayment({ to: String(input.to), amountSol: Number(input.amountSol) }); return { status: 'success', action: d.action, findings: d.findings }; }
        catch (e) { return { status: 'error', message: (e as Error).message }; }
      },
    },
  ];

  return {
    name: 'vera',
    methods: {
      veraCheck: check,
      veraRequire: (address: string, minTier: Exclude<Tier, 'unknown'> = 'medium') => vera.require(address, minTier),
      veraGuardPayment: (to: string, amountSol: number) => guard.evaluatePayment({ to, amountSol }),
    },
    actions,
    initialize() {},
  };
}

export default createVeraPlugin;
