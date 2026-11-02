import { getSigner, config } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// served at /.well-known/vera.json via a rewrite in next.config.mjs
export function GET() {
  return Response.json({ issuer: getSigner().publicKey, attestation_version: 1, anchor: config.anchor, ttl_hours: config.ttlHours });
}
