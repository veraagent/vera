import { revalidatePath } from 'next/cache';
import { saveToken, publishToken, adminKeyOk } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One-click links for the team, same as the other project sites:
//   /api/ca?key=<VERA_ADMIN_KEY>&mint=<CA>   reveal the token section with this CA
//   /api/ca?key=<VERA_ADMIN_KEY>&clear       hide it again
const page = (status: number, title: string, body: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title}</title><body style="font:16px system-ui;padding:40px;max-width:640px"><h1 style="font:600 28px Georgia,serif">${title}</h1><p>${body}</p><p><a href="/">veraagent.io</a></p></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (!adminKeyOk(q.get('key'))) return page(401, 'Wrong key', 'The key in the link is not valid.');
  if (q.has('clear')) {
    await saveToken(null);
    revalidatePath('/');
    return page(200, 'CA cleared', 'The token section is hidden on veraagent.io.');
  }
  const mint = q.get('mint');
  if (!mint) return page(400, 'Missing mint', 'Add &amp;mint=&lt;CA&gt; or &amp;clear to the link.');
  const r = await publishToken(mint);
  if (!r.ok) return page(r.status, 'Not saved', esc(r.error));
  revalidatePath('/');
  const t = r.token;
  return page(200, 'CA is live', `${esc(t.symbol ? '$' + t.symbol : t.name ?? '')} · <code>${esc(t.ca)}</code><br>The token section is now on veraagent.io.`);
}
