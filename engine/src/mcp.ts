// Vera MCP server (stdio). Gives any MCP-capable agent a vera_check tool to call before it pays.
// With VERA_API_URL set it calls the hosted API; otherwise it runs the engine locally.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API = process.env.VERA_API_URL?.replace(/\/$/, '');

async function runCheck(address: string) {
  if (API) {
    const r = await fetch(`${API}/v1/check`, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.VERA_API_KEY ? { 'x-api-key': process.env.VERA_API_KEY } : {}) }, body: JSON.stringify({ address }) });
    const j = await r.json();
    if (!r.ok) throw new Error((j as { error?: string }).error || `HTTP ${r.status}`);
    return j as { id: string; attestation: { score: number | null; tier: string; reasons: { kind: string; text: string }[]; expires_at: string }; signature: string; summary: string | null };
  }
  const { check } = await import('../../site/lib/engine/index');
  return check(address);
}

const server = new McpServer({ name: 'vera', version: '0.1.0' });
server.registerTool(
  'vera_check',
  {
    title: 'Vera trust check',
    description: 'Check a Solana counterparty address before paying it. Returns a 0-100 trust score, a tier (high/medium/low/unknown), the reasons behind it, and a signed attestation id. Call this before sending funds to an address you have not verified.',
    inputSchema: { address: z.string().describe('Solana address of the counterparty (base58)') },
  },
  async ({ address }) => {
    try {
      const r = await runCheck(address.trim());
      const a = r.attestation;
      const lines = [
        `Vera trust check for ${address}`,
        `Score: ${a.score ?? 'n/a'} / 100 · Tier: ${a.tier.toUpperCase()}`,
        ...(r.summary ? [`Summary: ${r.summary}`] : []),
        'Reasons:',
        ...a.reasons.map((x) => `- [${x.kind}] ${x.text}`),
        `Attestation: ${r.id} (signature ${r.signature.slice(0, 16)}…, expires ${a.expires_at})`,
        'A score is a risk signal, not a guarantee.',
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }], structuredContent: { id: r.id, score: a.score, tier: a.tier, reasons: a.reasons } };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Vera check failed: ${(e as Error).message}` }] };
    }
  },
);

await server.connect(new StdioServerTransport());
