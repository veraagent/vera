// Runtime config, all from env. See engine/.env.example.
// The engine core lives here (site/lib/engine) so the Next.js app on Vercel and the standalone server/CLI/MCP share one copy.
import path from 'node:path';

const heliusKey = process.env.HELIUS_API_KEY ?? '';
const falKey = process.env.FAL_KEY ?? '';
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
// AI provider: fal (OpenRouter router on fal.ai) when FAL_KEY is set, else the Anthropic API, else off
const provider: 'fal' | 'anthropic' | 'off' = process.env.VERA_AI === 'off' ? 'off' : falKey ? 'fal' : anthropicKey ? 'anthropic' : 'off';

export const config = {
  heliusKey,
  rpcUrl: process.env.VERA_RPC_URL || process.env.HELIUS_RPC || (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : 'https://api.mainnet-beta.solana.com'),
  enhancedUrl: process.env.HELIUS_ENHANCED_URL || 'https://api.helius.xyz/v0',
  provider,
  falKey,
  model: process.env.VERA_MODEL || (provider === 'fal' ? 'anthropic/claude-opus-5.5' : 'claude-opus-5-5'),
  // the AI may move the deterministic score by at most this many points
  aiBand: Number(process.env.VERA_AI_BAND || 15),
  aiTimeoutMs: Number(process.env.VERA_AI_TIMEOUT_MS || 25_000),
  ttlHours: Number(process.env.VERA_TTL_HOURS || 24),
  // on-chain anchoring of attestation hashes via the Memo program: off | devnet | mainnet
  anchor: (process.env.VERA_ANCHOR || 'off') as 'off' | 'devnet' | 'mainnet',
  apiKeys: (process.env.VERA_API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean),
  anonPerMinute: Number(process.env.VERA_ANON_PER_MIN || 10),
  cacheMinutes: Number(process.env.VERA_CACHE_MIN || 10),
  signerPath: process.env.VERA_SIGNER_PATH || path.join(process.cwd(), '.keys', 'signer.json'),
  storePath: process.env.VERA_STORE_PATH || (process.env.VERCEL ? '/tmp/vera-attestations.jsonl' : path.join(process.cwd(), 'data', 'attestations.jsonl')),
};

export const aiEnabled = () => config.provider !== 'off';
