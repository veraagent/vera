import { config, aiEnabled } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, ai: aiEnabled() ? { provider: config.provider, model: config.model } : null, anchor: config.anchor, data: !!config.heliusKey });
}
