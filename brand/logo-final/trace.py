"""Trace the chosen Ideogram V (logo-v4/out/serif-2.png) into a clean SVG path in the exact brand colour.
   python trace.py  ->  v.svg (mark only, tight viewBox, #941900)"""
import os
import numpy as np
import potrace
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'logo-v4', 'out', 'serif-2.png')
BRICK = '#941900'

img = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
r, g, b = img[..., 0], img[..., 1], img[..., 2]
mask = (r - g > 60) & (r - b > 60)            # the red letter only
ys, xs = np.where(mask)
pad = 4
y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad, xs.min() - pad, xs.max() + pad
crop = mask[y0:y1, x0:x1]

bm = potrace.Bitmap(~crop)  # potracer fills dark (falsy) pixels, so the letter must be False
plist = bm.trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.2)


def fmt(p):
    return f'{p.x:.2f},{p.y:.2f}'


d = []
for curve in plist:
    d.append(f'M{fmt(curve.start_point)}')
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f'L{fmt(seg.c)}L{fmt(seg.end_point)}')
        else:
            d.append(f'C{fmt(seg.c1)} {fmt(seg.c2)} {fmt(seg.end_point)}')
    d.append('Z')
h, w = crop.shape
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><path fill="{BRICK}" fill-rule="evenodd" d="{"".join(d)}"/></svg>'
open(os.path.join(HERE, 'v.svg'), 'w').write(svg)
print('v.svg', w, 'x', h, 'paths', len(plist))
