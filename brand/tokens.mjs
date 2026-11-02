// Vera Agent brand tokens, taken from veralayer.io (the parent brand). Every SVG, PNG export and the website read from here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));

export const color = {
  // ground: white with blush radial washes, as on veralayer.io
  paper: '#FFFFFF',
  blush: '#FFD4D2', // radial wash, strong
  blushSoft: '#FFF1F0', // radial wash, soft
  cream: '#FFF9F7',
  // ink: black + warm stone greys
  ink: '#000000',
  stone900: '#1C1917',
  stone800: '#292524',
  stone600: '#57534E',
  stone500: '#78716C', // body copy
  stone400: '#A8A29E', // small labels
  stone200: '#E7E5E4', // hairlines
  stone100: '#F5F5F4',
  stone50: '#FAFAF9',
  night: '#0C0A09', // the dark section
  // accents
  brick: '#941900', // signature: italic headline words, eyebrows, secondary button
  coral: '#FF6B4A', // icon discs, accent on dark
  // trust tiers
  high: '#166534',
  medium: '#92400E',
  low: '#B91C1C',
  unknown: '#78716C',
  // tiers on dark
  highOnDark: '#22C55E',
  mediumOnDark: '#EAB308',
  lowOnDark: '#F87171',
};

export const font = {
  serif: "'Newsreader', Georgia, serif", // headlines; accent words in italic 700 brick
  sans: "'Montserrat', ui-sans-serif, system-ui, sans-serif", // UI, body, uppercase labels
  logo: "'Poppins', ui-sans-serif, sans-serif", // the VeraLayer wordmark only
  mono: "'JetBrains Mono', ui-monospace, monospace", // addresses and code only
};

// Fonts are embedded as data URIs so every SVG renders identically anywhere (all OFL).
const b64 = (f) => fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
let fontCss = null;
export function fontFaceCss() {
  if (fontCss) return fontCss;
  fontCss = [
    ['Newsreader', 'Newsreader.woff2', '200 800', 'normal'],
    ['Newsreader', 'Newsreader-italic.woff2', '200 800', 'italic'],
    ['Montserrat', 'Montserrat.woff2', '100 900', 'normal'],
    ['Poppins', 'Poppins-700.woff2', '700', 'normal'],
    ['JetBrains Mono', 'JetBrainsMono.woff2', '100 800', 'normal'],
  ].map(([fam, file, w, st]) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:${st};src:url(data:font/woff2;base64,${b64(file)}) format('woff2');}`).join('');
  return fontCss;
}

// WCAG contrast ratio
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
