import { revalidatePath } from 'next/cache';
import { loadToken, saveToken, publishToken, adminKeyOk } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: the project token, or { token: null } before launch
export async function GET() {
  return Response.json({ token: await loadToken() });
}

// POST { ca } with x-admin-key: reveal the token section. DELETE: hide it again.
export async function POST(req: Request) {
  if (!adminKeyOk(req.headers.get('x-admin-key'))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { ca } = (await req.json().catch(() => ({}))) as { ca?: string };
  const r = await publishToken(String(ca ?? ''));
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  revalidatePath('/');
  return Response.json({ token: r.token });
}

export async function DELETE(req: Request) {
  if (!adminKeyOk(req.headers.get('x-admin-key'))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await saveToken(null);
  revalidatePath('/');
  return Response.json({ token: null });
}
