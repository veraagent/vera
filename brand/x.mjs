// X (Twitter) creatives + the Open Graph image, in the veralayer.io style:
// white + blush washes, Newsreader headlines with italic brick words, Montserrat uppercase eyebrows, white cards with r=32.
import { color as C, font as F } from './tokens.mjs';
import { svg, esc, line, eyebrow, blush, rule } from './marks.mjs';

const SITE = 'veralayer.io';

// example data for score cards: labelled EXAMPLE everywhere it appears
export const EXAMPLE = {
  short: '7Ftq9m…fKpL2mR',
  score: 87,
  tier: 'high',
  reasons: [
    ['ok', 'Wallet active for 412 days'],
    ['ok', 'No links to flagged clusters'],
    ['ok', '38 consistent counterparties'],
    ['warn', '2 calls to unverified programs'],
  ],
  sig: '4Kp9…eX1q',
};
const TIER = { high: ['High trust', C.high], medium: ['Medium trust', C.medium], low: ['Low trust', C.low], unknown: ['Unknown', C.unknown] };

export async function buildX({ out, FONTS, textW, markRing, themes }) {
  const S = { style: FONTS };
  const shadow = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#5A1A0A" flood-opacity=".10"/></filter></defs>`;
  const mark = (x, y, s, t = themes.light) => `<g transform="translate(${x} ${y}) scale(${s / 100})">${markRing(t)}</g>`;
  // small lockup for creative corners: ring mark + "Vera Agent"
  const lockup = (x, y, s = 1, dark = false) => `<g transform="translate(${x} ${y}) scale(${s})">${mark(0, 0, 56, dark ? themes.dark : themes.light)}${line(70, 40, 36, [['Vera', { italic: true, fill: dark ? C.coral : C.brick }], [' Agent', { fill: dark ? '#fff' : C.ink }]], { ls: -0.8 })}</g>`;
  const site = (x, y, anchor = 'start', fill = C.stone600) => eyebrow(x, y, 17, SITE, { fill, anchor, weight: 600 });
  const body = (x, y, size, lines, { fill = C.stone500, anchor = 'start', lh = 1.5 } = {}) =>
    lines.map((l, i) => `<text x="${x}" y="${y + i * size * lh}" font-family="${F.sans}" font-weight="400" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`).join('');

  const glyph = (kind, cx, cy, r) => {
    const col = kind === 'ok' ? C.high : kind === 'warn' ? C.medium : C.low;
    const k = r / 10;
    const sym = kind === 'ok'
      ? `<polyline points="${cx - 4.5 * k},${cy} ${cx - 1.2 * k},${cy + 3.4 * k} ${cx + 5 * k},${cy - 3.6 * k}" fill="none" stroke="#fff" stroke-width="${2.4 * k}" stroke-linecap="round" stroke-linejoin="round"/>`
      : kind === 'warn'
        ? `<rect x="${cx - 1.2 * k}" y="${cy - 5 * k}" width="${2.4 * k}" height="${6 * k}" rx="${1.2 * k}" fill="#fff"/><circle cx="${cx}" cy="${cy + 4 * k}" r="${1.4 * k}" fill="#fff"/>`
        : `<path d="M${cx - 4 * k} ${cy - 4 * k}L${cx + 4 * k} ${cy + 4 * k}M${cx + 4 * k} ${cy - 4 * k}L${cx - 4 * k} ${cy + 4 * k}" stroke="#fff" stroke-width="${2.4 * k}" stroke-linecap="round"/>`;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>${sym}`;
  };

  // The score card. u = scale (1 = tuned for a 500px-wide card). Uses the score-ring motif from veralayer.io.
  async function scoreCard(x, y, w, d = EXAMPLE, u = 1) {
    const [tierLabel, tierCol] = TIER[d.tier];
    const pad = 36 * u, rowH = 44 * u;
    const ringR = 62 * u, ringSW = 11 * u;
    const h = pad + 40 * u + 2 * ringR + 30 * u + d.reasons.length * rowH + 20 * u + 58 * u;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${32 * u}" fill="#fff" stroke="${C.stone200}" stroke-width="${1.5 * u}" filter="url(#sh)"/>`;
    let yy = y + pad;
    s += eyebrow(x + pad, yy + 12 * u, 13 * u, 'Vera trust check');
    const tagW = 92 * u;
    s += `<rect x="${x + w - pad - tagW}" y="${yy - 8 * u}" width="${tagW}" height="${28 * u}" rx="${14 * u}" fill="${C.stone100}"/>`;
    s += eyebrow(x + w - pad - tagW / 2, yy + 11 * u, 11 * u, 'Example', { fill: C.stone500, anchor: 'middle' });
    yy += 40 * u;
    // ring with the score inside
    const cx = x + pad + ringR, cy = yy + ringR;
    s += `<circle cx="${cx}" cy="${cy}" r="${ringR - ringSW / 2}" fill="none" stroke="${C.stone100}" stroke-width="${ringSW}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${ringR - ringSW / 2}" fill="none" stroke="${C.brick}" stroke-width="${ringSW}" pathLength="100" stroke-dasharray="${d.score} 100" transform="rotate(-90 ${cx} ${cy})"/>`;
    s += line(cx, cy + 18 * u, 54 * u, String(d.score), { anchor: 'middle', ls: -1.5 * u });
    // right of the ring: tier pill, address
    const rx = cx + ringR + 30 * u;
    const pillW = (await textW(tierLabel.toUpperCase(), F.sans, 700, 13 * u, { ls: 13 * u * 0.22 })) + 50 * u;
    s += `<rect x="${rx}" y="${cy - 46 * u}" width="${pillW}" height="${36 * u}" rx="${18 * u}" fill="${tierCol}" fill-opacity=".1"/>`;
    s += `<circle cx="${rx + 20 * u}" cy="${cy - 28 * u}" r="${5 * u}" fill="${tierCol}"/>`;
    s += eyebrow(rx + 34 * u, cy - 23.5 * u, 13 * u, tierLabel, { fill: tierCol });
    s += `<text x="${rx}" y="${cy + 18 * u}" font-family="${F.sans}" font-size="${15 * u}" fill="${C.stone500}">score out of 100</text>`;
    s += `<text x="${rx}" y="${cy + 46 * u}" font-family="${F.mono}" font-size="${15 * u}" fill="${C.stone800}">${esc(d.short)}</text>`;
    yy += 2 * ringR + 30 * u;
    for (const [kind, txt] of d.reasons) {
      s += glyph(kind, x + pad + 12 * u, yy + 12 * u, 12 * u);
      s += `<text x="${x + pad + 38 * u}" y="${yy + 18.5 * u}" font-family="${F.sans}" font-weight="500" font-size="${18 * u}" fill="${C.stone800}">${esc(txt)}</text>`;
      yy += rowH;
    }
    yy += 6 * u;
    s += `<line x1="${x + pad}" y1="${yy}" x2="${x + w - pad}" y2="${yy}" stroke="${C.stone200}" stroke-width="${1.5 * u}"/>`;
    s += `<text x="${x + pad}" y="${yy + 36 * u}" font-family="${F.mono}" font-size="${14 * u}" fill="${C.stone500}">Signed · ${esc(d.sig)}</text>`;
    s += line(x + w - pad, yy + 37 * u, 20 * u, [['verifiable on-chain', { italic: true }]], { anchor: 'end' });
    return { markup: s, h };
  }

  // ---- avatar 400: the ring mark on a blush wash, safe inside X's circle crop ----
  out('x/avatar-400.svg', svg(400, 400, `${blush(400, 400, { at: [0.15, 0.1], r: 1 })}${mark(80, 80, 240)}`, S), [{ png: 'x/avatar-400.png', w: 400, h: 400 }]);

  // ---- header 1500x500: the avatar covers the bottom-left (~0..400 x 280..500), so text starts at x=470 ----
  {
    const w = 1500, h = 500;
    let m = blush(w, h, { at: [1, 1], r: 0.7 });
    m += eyebrow(470, 150, 18, 'Vera Agent · by VeraLayer');
    m += line(468, 248, 74, 'The trust layer for', { ls: -1.8 });
    m += line(468, 334, 74, [['agent-to-agent', { italic: true }], [' commerce.']], { ls: -1.8 });
    m += rule(470, 384, 260, 4);
    m += site(470, 436);
    out('x/header-1500x500.svg', svg(w, h, m, S), [{ png: 'x/header-1500x500.png', w, h }]);
  }

  // ---- launch 1200x675 ----
  {
    const w = 1200, h = 675;
    let m = shadow + blush(w, h, { at: [0, 0], r: 0.8 });
    m += lockup(64, 52, 0.9);
    m += eyebrow(66, 214, 16, 'Introducing Vera Agent');
    m += line(62, 300, 76, 'Before your agent', { ls: -1.9 });
    m += line(62, 384, 76, [['pays, '], ['ask Vera.', { italic: true }]], { ls: -1.9 });
    m += body(66, 450, 23, ['Trust scores with reasons and a signed,', 'on-chain attestation, for agent-to-agent', 'commerce on Solana.']);
    m += site(66, 618);
    m += (await scoreCard(700, 110, 450, EXAMPLE, 0.88)).markup;
    out('x/launch-1200x675.svg', svg(w, h, m, S), [{ png: 'x/launch-1200x675.png', w, h }]);
  }

  // ---- thread 1: the problem (the "legacy blind spot" list pattern from veralayer.io) ----
  {
    const w = 1200, h = 675;
    let m = shadow + blush(w, h, { at: [1, 0], r: 0.75 });
    m += eyebrow(66, 110, 16, '01 · The problem');
    m += line(62, 210, 76, 'Agents can’t tell', { ls: -1.9 });
    m += line(62, 296, 76, [['who to trust.', { italic: true }]], { ls: -1.9 });
    m += body(66, 370, 24, ['Your agent is about to pay an address it has', 'never seen. No reputation, no history,', 'no second opinion.']);
    m += site(66, 610);
    // card: before / after
    const cx = 760, cy = 170, cw = 380, ch = 330;
    m += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="32" fill="#fff" stroke="${C.stone200}" stroke-width="1.5" filter="url(#sh)"/>`;
    m += eyebrow(cx + 36, cy + 58, 13, 'Today');
    m += `<circle cx="${cx + 52}" cy="${cy + 112}" r="16" fill="${C.stone100}"/><circle cx="${cx + 52}" cy="${cy + 112}" r="8" fill="none" stroke="${C.stone400}" stroke-width="2.4"/><line x1="${cx + 46}" y1="${cy + 118}" x2="${cx + 58}" y2="${cy + 106}" stroke="${C.stone400}" stroke-width="2.4"/>`;
    m += `<text x="${cx + 84}" y="${cy + 120}" font-family="${F.sans}" font-weight="500" font-size="21" fill="${C.stone400}" text-decoration="line-through">Sign and hope</text>`;
    m += `<line x1="${cx + 36}" y1="${cy + 166}" x2="${cx + cw - 36}" y2="${cy + 166}" stroke="${C.stone200}" stroke-width="1.5"/>`;
    m += eyebrow(cx + 36, cy + 214, 13, 'With Vera');
    m += glyph('ok', cx + 52, cy + 268, 16);
    m += `<text x="${cx + 84}" y="${cy + 276}" font-family="${F.sans}" font-weight="700" font-size="21" fill="${C.ink}">Ask Vera, then pay</text>`;
    out('x/thread-1-problem.svg', svg(w, h, m, S), [{ png: 'x/thread-1-problem.png', w, h }]);
  }

  // ---- thread 2: how it works (coral discs, like "How It Works" on veralayer.io) ----
  {
    const w = 1200, h = 675;
    let m = blush(w, h, { at: [1, 1], r: 0.8 });
    m += eyebrow(600, 92, 16, '02 · How Vera works', { anchor: 'middle' });
    m += line(600, 178, 72, [['Ask. Score. '], ['Attest.', { italic: true }]], { anchor: 'middle', ls: -1.8 });
    m += rule(470, 212, 260, 4);
    const steps = [
      ['Agent asks', ['Before a payment, the', 'agent sends the', 'counterparty to Vera.']],
      ['Vera scores', ['A 0–100 score and a', 'tier, with the reasons', 'behind it.']],
      ['Signed attestation', ['The result is signed', 'and verifiable', 'on-chain.']],
    ];
    steps.forEach(([title, lines], i) => {
      const cx = 220 + i * 380, y = 330;
      m += `<circle cx="${cx}" cy="${y}" r="46" fill="${i === 2 ? C.brick : C.coral}"/>`;
      m += line(cx, y + 17, 50, [[String(i + 1), { italic: true, fill: '#fff' }]], { anchor: 'middle' });
      m += line(cx, y + 112, 34, title, { anchor: 'middle', ls: -0.5 });
      m += body(cx, y + 162, 21, lines, { anchor: 'middle' });
    });
    out('x/thread-2-how.svg', svg(w, h, m, S), [{ png: 'x/thread-2-how.png', w, h }]);
  }

  // ---- thread 3: example score card ----
  {
    const w = 1200, h = 675;
    let m = shadow + blush(w, h, { at: [0, 1], r: 0.8 });
    m += eyebrow(66, 110, 16, '03 · An example check');
    m += line(62, 210, 76, 'A score you', { ls: -1.9 });
    m += line(62, 296, 76, [['can read.', { italic: true }]], { ls: -1.9 });
    m += body(66, 370, 24, ['Every score comes with the reasons', 'behind it and a signed attestation', 'anyone can verify.']);
    m += eyebrow(66, 610, 13, 'Example data, for illustration', { fill: C.stone400, weight: 600 });
    m += (await scoreCard(640, 60, 500, EXAMPLE, 1.0)).markup;
    out('x/thread-3-scorecard.svg', svg(w, h, m, S), [{ png: 'x/thread-3-scorecard.png', w, h }]);
  }

  // ---- thread 4: Built on Solana (text only) + CTA, in the dark "The Result" section style ----
  {
    const w = 1200, h = 675;
    let m = `<rect width="${w}" height="${h}" fill="#fff"/>${blush(w, h, { at: [0.5, 1], r: 0.7 })}`;
    m += `<rect x="40" y="40" width="${w - 80}" height="${h - 80}" rx="56" fill="${C.night}"/>`;
    m += eyebrow(600, 168, 16, 'The rail', { fill: C.coral, anchor: 'middle' });
    m += line(600, 290, 96, [['Built on '], ['Solana.', { italic: true, fill: C.coral }]], { anchor: 'middle', fill: '#fff', ls: -2.4 });
    m += body(600, 360, 24, ['Fast, cheap attestations for agents that transact.'], { anchor: 'middle', fill: C.stone400 });
    m += `<rect x="440" y="420" width="320" height="68" rx="14" fill="#fff"/>`;
    m += eyebrow(600, 461, 17, 'Join the waitlist', { fill: C.ink, anchor: 'middle' });
    m += site(600, 560, 'middle', C.stone400);
    out('x/thread-4-solana-cta.svg', svg(w, h, m, S), [{ png: 'x/thread-4-solana-cta.png', w, h }]);
  }

  // ---- score card template 1080x1080 ----
  {
    const w = 1080, h = 1080;
    let m = shadow + blush(w, h, { at: [0, 0], r: 0.9 });
    m += lockup(80, 70, 1);
    m += site(w - 80, 112, 'end');
    m += (await scoreCard(80, 210, 920, EXAMPLE, 1.62)).markup;
    out('x/scorecard-1080.svg', svg(w, h, m, S), [{ png: 'x/scorecard-1080.png', w, h }]);
  }

  // ---- teaser 1200x675 ----
  {
    const w = 1200, h = 675;
    let m = blush(w, h, { at: [0.5, 0], r: 0.75 });
    m += mark(540, 92, 120);
    m += eyebrow(600, 290, 16, 'Coming soon', { anchor: 'middle' });
    m += line(600, 400, 120, [['Vera', { italic: true }], [' Agent']], { anchor: 'middle', ls: -3 });
    m += rule(470, 440, 260, 4);
    m += body(600, 500, 25, ['The trust layer for agent-to-agent commerce.'], { anchor: 'middle' });
    m += site(600, 600, 'middle');
    out('x/teaser-coming-soon.svg', svg(w, h, m, S), [{ png: 'x/teaser-coming-soon.png', w, h }]);
  }

  // ---- Open Graph 1200x630 ----
  {
    const w = 1200, h = 630;
    let m = shadow + blush(w, h, { at: [0, 0], r: 0.8 });
    m += lockup(64, 52, 0.9);
    m += line(62, 258, 70, 'The trust layer for', { ls: -1.7 });
    m += line(62, 336, 70, [['agent-to-agent', { italic: true }]], { ls: -1.7 });
    m += line(62, 414, 70, 'commerce.', { ls: -1.7 });
    m += body(66, 480, 23, ['Scores, reasons and signed attestations on Solana.']);
    m += site(66, 572);
    m += (await scoreCard(716, 90, 430, EXAMPLE, 0.84)).markup;
    out('og/og-1200x630.svg', svg(w, h, m, S), [{ png: 'og/og-1200x630.png', w, h }]);
  }
}
