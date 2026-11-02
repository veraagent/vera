// Standalone Vera HTTP API (same routes as the Next.js deploy), for self-hosting outside Vercel.
//   GET  /health
//   GET  /.well-known/vera.json          issuer public key
//   POST /v1/check {address, fresh?}     score + signed attestation
//   GET  /v1/check/:address
//   POST /v1/check/batch {addresses}     up to 10
//   GET  /v1/attestations/:id
//   POST /v1/verify {attestation, signature}
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config, aiEnabled, check, checkMany, getAttestation, getSigner, verify, gate, publicError, type Attestation } from '../../site/lib/engine/index';

const app = new Hono();
app.use('*', cors());

const guard = async (c: { req: { raw: Request }; json: (b: unknown, s?: number) => Response }, next: () => Promise<void>) => {
  const g = gate(c.req.raw.headers);
  if (!g.ok) return c.json({ error: g.error }, g.status);
  await next();
};
app.use('/v1/check', guard);
app.use('/v1/check/*', guard);

app.get('/health', (c) => c.json({ ok: true, ai: aiEnabled() ? { provider: config.provider, model: config.model } : null, anchor: config.anchor, data: !!config.heliusKey }));
app.get('/.well-known/vera.json', (c) => c.json({ issuer: getSigner().publicKey, attestation_version: 1, anchor: config.anchor, ttl_hours: config.ttlHours }));
app.post('/v1/check/batch', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { addresses?: unknown };
  if (!Array.isArray(body.addresses) || !body.addresses.length) return c.json({ error: 'addresses: non-empty array required (max 10)' }, 400);
  return c.json({ results: await checkMany(body.addresses.map(String)) });
});
app.post('/v1/check', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { address?: string; fresh?: boolean };
  try { return c.json(await check(String(body.address ?? '').trim(), { fresh: !!body.fresh })); }
  catch (e) { const { status, error } = publicError(e); return c.json({ error }, status as 400); }
});
app.get('/v1/check/:address', async (c) => {
  try { return c.json(await check(c.req.param('address'))); }
  catch (e) { const { status, error } = publicError(e); return c.json({ error }, status as 400); }
});
app.get('/v1/attestations/:id', async (c) => {
  const a = await getAttestation(c.req.param('id'));
  return a ? c.json(a) : c.json({ error: 'not found' }, 404);
});
app.post('/v1/verify', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { attestation?: Attestation; signature?: string };
  if (!body.attestation || !body.signature) return c.json({ error: 'attestation and signature required' }, 400);
  return c.json(verify(body.attestation, body.signature, getSigner().publicKey));
});

const port = Number(process.env.PORT || 8790);
serve({ fetch: app.fetch, port });
console.log(`[vera] API on http://localhost:${port} · issuer ${getSigner().publicKey} · AI ${aiEnabled() ? `${config.provider}:${config.model}` : 'off'} · anchor ${config.anchor}`);
