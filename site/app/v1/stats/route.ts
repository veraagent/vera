import { loadStats } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// live counters; { stats: null } when no shared store is connected
export async function GET() {
  return Response.json({ stats: await loadStats() }, { headers: { 'cache-control': 'public, s-maxage=30' } });
}
