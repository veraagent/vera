// Vera plugin for Solana Agent Kit v2.
//
//   import { SolanaAgentKit } from 'solana-agent-kit';
//   import { createVeraPlugin } from '@veralayer/solana-agent-kit-plugin';
//   const agent = new SolanaAgentKit(wallet, rpcUrl, {}).use(createVeraPlugin({ apiKey: process.env.VERA_KEY }));
//   const check = await agent.methods.veraCheck('<address>');
//
// Adds the VERA_TRUST_CHECK action (for LangChain / Vercel AI / OpenAI tool adapters) and two methods:
// veraCheck(address), veraRequire(address, minTier) which throws below the tier, and veraGuardPayment(to, sol).
import type { Action, Plugin, SolanaAgentKit } from 'solana-agent-kit';
import { z } from 'zod';
import { Vera, VeraGuard, type Policy, type Tier } from 'veralayer';

export function createVeraPlugin(opts: { apiUrl?: string; apiKey?: string; issuer?: string; policy?: Policy } = {}): Plugin {
  const vera = new Vera(opts);
  const guard = new VeraGuard({ vera, policy: opts.policy });

  const check = async (address: string) => {
    const r = await vera.check(address);
    const v = await vera.verify(r);
    return {
      address,
      score: r.attestation.score,
      tier: r.attestation.tier,
      reasons: r.attestation.reasons,
      summary: r.summary,
      attestation_id: r.id,
      signature_valid: v.valid,
      expires_at: r.attestation.expires_at,
    };
  };

  const action: Action = {
    name: 'VERA_TRUST_CHECK',
    similes: ['check counterparty', 'is this address safe to pay', 'trust score', 'vet wallet before payment', 'verify recipient'],
    description:
      'Check a Solana counterparty address with Vera before sending it funds. Returns a 0-100 trust score, a tier (high/medium/low/unknown), the reasons, and whether the signed attestation verified. Use before any payment to an address the agent has not verified. A score is a risk signal, not a guarantee.',
    examples: [[
      {
        input: { address: '<counterparty address>' },
        output: { status: 'success', score: 87, tier: 'high', reasons: [{ kind: 'ok', text: 'Active for 412 days' }], signature_valid: true },
        explanation: 'Illustrative output: score the recipient before paying it',
      },
    ]],
    schema: z.object({ address: z.string().min(32).max(44).describe('Solana address of the counterparty') }),
    handler: async (_agent: SolanaAgentKit, input: Record<string, any>) => {
      try {
        return { status: 'success', ...(await check(String(input.address))) };
      } catch (e) {
        return { status: 'error', message: (e as Error).message };
      }
    },
  };

  return {
    name: 'vera',
    methods: {
      veraCheck: check,
      veraRequire: async (address: string, minTier: Exclude<Tier, 'unknown'> = 'medium') => vera.require(address, minTier),
      // full guard decision for a planned SOL payment, using the policy passed to createVeraPlugin
      veraGuardPayment: async (to: string, amountSol: number) => guard.evaluatePayment({ to, amountSol }),
    },
    actions: [action],
    initialize() {},
  };
}

export default createVeraPlugin;
