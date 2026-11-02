# Vera Agent: brand guidelines

Vera Agent by VeraLayer is the trust layer for agent-to-agent commerce on Solana. Before an agent pays, it asks Vera and gets back a score, a tier, the reasons, and a signed on-chain attestation.

**Vera is a product of VeraLayer, so it uses the VeraLayer look exactly as it appears on veralayer.io:**
- a white page with blush radial washes
- Newsreader serif headlines, with the accent words set in italic brick
- Montserrat for the interface, with labels in uppercase and wide letter spacing
- black buttons
- one dark section with large rounded corners

Everything in `/brand` is generated from code. Change `tokens.mjs`, `build.mjs` or `x.mjs`, then run `node build.mjs && node export.mjs`.

## 1. Logo

**The mark is an italic Newsreader V inside a score ring that is 87% filled.** The V comes from the italic accent of the VeraLayer headlines. The ring echoes the score rings on veralayer.io and stands for the trust score itself.

Three concepts were explored (`logo/concepts/`):

| Concept | Verdict |
|---|---|
| A, V on a blush tile | Kept as the **favicon**, because the ring is too fine below 32 px |
| B, "Vera." wordmark | Too close to the VeraLayer wordmark |
| C, V in a score ring | **Chosen.** It carries the product's meaning |

**Logo files**

| File | Use |
|---|---|
| `logo/full-*` | Mark, the **Vera** Agent wordmark, and "by VeraLayer". This is the default. |
| `logo/mark-*` | Avatar, app icon, small square placements |
| `logo/wordmark-*` | Text-only placements |

Each comes in four variants:
- `light`: brick on white. This is the primary variant.
- `dark`: coral and white, for night backgrounds.
- `mono-black`
- `mono-white`

**Rules**
- **Wordmark:** "Vera" is italic 700 in brick and "Agent" is upright 500, the same pairing as the veralayer.io H1.
- **Endorsement:** "VeraLayer" is always set in Poppins 700 with tight tracking, exactly as the parent brand sets it.
- **Clear space:** keep at least half the ring's radius clear on every side.
- **Minimum size:** 24 px for the ring mark. Use the favicon tile below that.

## 2. Colour

| Token | Hex | Role |
|---|---|---|
| paper | `#FFFFFF` | Page |
| blush | `#FFD4D2` | Radial washes in section corners |
| blushSoft | `#FFF1F0` | Soft wash |
| cream | `#FFF9F7` | Callout fill |
| ink | `#000000` | Headlines, buttons |
| stone500 | `#78716C` | Body copy |
| stone200 | `#E7E5E4` | Hairlines, card borders |
| **brick** | `#941900` | Signature accent: italic words, eyebrow labels, rings |
| coral | `#FF6B4A` | Number discs, accent on dark |
| night | `#0C0A09` | The dark section |
| high | `#166534` | Trust tier: high |
| medium | `#92400E` | Trust tier: medium |
| low | `#B91C1C` | Trust tier: low |
| unknown | `#78716C` | Trust tier: unknown |

**Rules**
- The gradient rule under section titles runs brick → coral → `#E5E2E1`.
- Tier colours only ever mean a tier, and they always appear with a label and a glyph.

**Contrast (WCAG, from `palette/contrast.json`)**

| Pair | Ratio |
|---|---|
| ink / paper | 21 : 1 |
| brick / paper | 8.8 : 1 |
| brick / blush | 6.5 : 1 |
| stone600 / paper | 7.6 : 1 |
| stone500 / paper | 4.8 : 1 (body copy, AA) |
| high, medium, low / paper | 7.1, 7.1, 6.5 : 1 |
| coral / night | 7.0 : 1 |
| white / night | 19.8 : 1 |

## 3. Typography

| Role | Font |
|---|---|
| Headlines | **Newsreader** 500. Accent words in italic 700 brick. Tracking −2.5 % at display sizes. |
| UI, body, labels | **Montserrat**. Body 400 in stone500. Labels 700, uppercase, +22 % tracking, 10–12 px on the web. |
| Parent wordmark | **Poppins** 700, "VeraLayer" only |
| Addresses, code | **JetBrains Mono** 400. This is the only place mono is used. |

**On images:** headlines are at least 70 px and body text at least 23 px on a 1200-wide image.

## 4. Patterns, all taken from veralayer.io

- **Section opener:** an eyebrow label, a serif title with one italic brick phrase, then the gradient rule.
- **Cards:** white, `r=32`, a 1 px stone200 border, and a soft warm shadow.
- **Dark section:** night background, `r=48–56`, inset from the page edges, accent switched to coral.
- **How-it-works:** coral discs with italic serif numbers. The last step uses brick.
- **Score card:** an EXAMPLE tag, a brick score ring with the number in serif, a tier pill, reasons with glyphs, and an attestation footer that reads "*verifiable on-chain*".
- **Data honesty:** example data is always labelled EXAMPLE or DEMO DATA.
- **No contract address in any image.**
- **No Solana logo:** "Built on Solana" is set as text only.

## 5. Voice

- **Plain, calm, specific.** Lead with the mechanism: score, reasons, signed attestation.
- **Avoid:** "guaranteed safe", "risk-free", "100 % accurate".
- **Disclose:** every token post says the team receives trading fees.
