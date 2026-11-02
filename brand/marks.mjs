// Shared SVG helpers. Vera's marks are typographic, like the VeraLayer brand: an italic Newsreader V and serif wordmarks.
import { color as C, font as F } from './tokens.mjs';

export const svg = (w, h, inner, { bg = null, viewBox = `0 0 ${w} ${h}`, style = '' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${style ? `<style>${style}</style>` : ''}${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${inner}</svg>`;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Text. `parts` = [[text, {italic, weight, fill}], ...] in one line, so a headline can mix upright and italic brick words.
export function line(x, y, size, parts, { family = F.serif, ls = 0, anchor = 'start', fill = C.ink, weight = 500 } = {}) {
  const spans = (Array.isArray(parts) ? parts : [[parts, {}]])
    .map(([t, o = {}]) => `<tspan font-style="${o.italic ? 'italic' : 'normal'}" font-weight="${o.weight || (o.italic ? 700 : weight)}" fill="${o.fill || (o.italic ? C.brick : fill)}">${esc(t)}</tspan>`)
    .join('');
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" letter-spacing="${ls}" text-anchor="${anchor}">${spans}</text>`;
}

// The uppercase tracked label used all over veralayer.io ("INFRASTRUCTURE LEVEL").
export const eyebrow = (x, y, size, t, { fill = C.brick, anchor = 'start', weight = 700 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${F.sans}" font-weight="${weight}" font-size="${size}" letter-spacing="${size * 0.22}" text-anchor="${anchor}" fill="${fill}">${esc(t.toUpperCase())}</text>`;

// Blush ground: white with radial washes, as on every veralayer.io section.
let gid = 0;
export function blush(w, h, { at = [0, 0], r = 0.75, strength = C.blush, base = C.paper } = {}) {
  const id = `bl${gid++}`;
  return `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${at[0] * w}" cy="${at[1] * h}" r="${Math.max(w, h) * r}"><stop offset="0" stop-color="${strength}"/><stop offset="1" stop-color="${base}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
}

// The brick -> coral -> stone rule under section titles on veralayer.io.
export function rule(x, y, w, h = 4) {
  const id = `ru${gid++}`;
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${C.brick}"/><stop offset=".5" stop-color="${C.coral}"/><stop offset="1" stop-color="#E5E2E1"/></linearGradient></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${id})"/>`;
}

// Monogram: italic serif V, optically centred in a box of `size` using a measured glyph box.
export function monogram(cx, cy, size, box, fill = C.brick) {
  // box = getBBox of the glyph at font-size 100 drawn at (0,0)
  const k = size / 100;
  const x = cx - (box.x + box.width / 2) * k, y = cy - (box.y + box.height / 2) * k;
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${F.serif}" font-style="italic" font-weight="700" font-size="${size}" fill="${fill}">V</text>`;
}
