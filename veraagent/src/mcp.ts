// MCP server over stdio (newline-delimited JSON-RPC 2.0), no extra dependencies.
// Start with `npx -y veralayer mcp`; add to Claude Desktop / Cursor as a stdio server.
// Tools: vera_check (score an address) and vera_guard_payment (full guard decision for a planned SOL payment).
import { createInterface } from 'node:readline';
import { Vera } from './client.js';
import { VeraGuard } from './guard.js';
import type { Policy } from './policy.js';

const VERSION = '0.2.0';
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const TOOLS = [
  {
    name: 'vera_check',
    title: 'Vera trust check',
    description: 'Score a Solana address before paying it. Returns a 0-100 trust score, a tier (high/medium/low/unknown), the reasons, and whether Vera\'s signed result verified. A score is a risk signal, not a guarantee.',
    inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Solana address (base58)' } }, required: ['address'] },
  },
  {
    name: 'vera_guard_payment',
    title: 'Vera payment guard',
    description: 'Decide whether a planned SOL payment should go ahead under a spending policy. Returns allow, review or block with the rule that fired. Call this before sending funds.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient Solana address' },
        amount_sol: { type: 'number', description: 'Amount in SOL' },
        min_tier: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Minimum recipient tier (default medium)' },
        max_sol_per_tx: { type: 'number', description: 'Optional cap for this payment' },
      },
      required: ['to', 'amount_sol'],
    },
  },
];

export async function runMcp(opts: { apiUrl?: string; apiKey?: string } = {}) {
  const vera = new Vera({ ...opts, issuer: process.env.VERA_ISSUER });
  const send = (msg: unknown) => process.stdout.write(JSON.stringify(msg) + '\n');
  const text = (t: string, structured?: unknown, isError = false) => ({ content: [{ type: 'text', text: t }], ...(structured ? { structuredContent: structured } : {}), ...(isError ? { isError } : {}) });

  async function call(name: string, args: Record<string, unknown>): Promise<ReturnType<typeof text> | null> {
    try {
      if (name === 'vera_check') {
        const address = String(args.address ?? '').trim();
        const r = await vera.check(address);
        const v = await vera.verify(r);
        const a = r.attestation;
        const lines = [
          `${a.score ?? 'n/a'}/100 · ${a.tier.toUpperCase()} · ${address}`,
          ...(r.summary ? [r.summary] : []),
          ...a.reasons.map((x) => `- [${x.kind}] ${x.text}`),
          `Signature ${v.valid ? 'verified' : 'INVALID'} · attestation ${r.id}`,
        ];
        return text(lines.join('\n'), { score: a.score, tier: a.tier, reasons: a.reasons, verified: v.valid, attestation_id: r.id });
      }
      if (name === 'vera_guard_payment') {
        const policy: Policy = {
          ...(args.min_tier ? { minTier: args.min_tier as Policy['minTier'] } : {}),
          ...(typeof args.max_sol_per_tx === 'number' ? { maxSolPerTx: args.max_sol_per_tx } : {}),
        };
        const amount = Number(args.amount_sol);
        if (!Number.isFinite(amount) || amount < 0) return text(`Invalid amount_sol: ${String(args.amount_sol)}`, undefined, true);
        const d = await new VeraGuard({ vera, policy }).evaluatePayment({ to: String(args.to), amountSol: amount });
        const lines = [`${d.action.toUpperCase()}: ${args.amount_sol} SOL to ${args.to}`, ...d.findings.map((f) => `- ${f.action}: ${f.message}`)];
        if (!d.findings.length) lines.push('- no policy rule fired');
        return text(lines.join('\n'), { action: d.action, findings: d.findings });
      }
      return null;
    } catch (e) {
      return text(`Vera failed: ${(e as Error).message}`, undefined, true);
    }
  }

  const rl = createInterface({ input: process.stdin });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let msg: { id?: number | string; method?: string; params?: Record<string, unknown> };
    try { msg = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
    const { id, method, params } = msg;
    if (id === undefined) return; // notifications (e.g. notifications/initialized) need no reply
    if (typeof method !== 'string') return send({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid request' } });
    const reply = (result: unknown) => send({ jsonrpc: '2.0', id, result });
    switch (method) {
      case 'initialize':
        return reply({ protocolVersion: PROTOCOLS.includes(params?.protocolVersion as string) ? params?.protocolVersion : PROTOCOLS[0], capabilities: { tools: {} }, serverInfo: { name: 'veralayer', version: VERSION } });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        const res = await call(String(params?.name), (params?.arguments as Record<string, unknown>) ?? {});
        return res ? reply(res) : send({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${String(params?.name)}` } });
      }
      default:
        return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  });
}
