#!/usr/bin/env python3
"""Make the wordmark / splash PNGs transparent (they have the old #121014 background baked in).
usage: python3 scripts/key-wordmark.py "assets/wordmark - TV logo gold.png" <target.png> [<target.png> ...]
Each target is overwritten with a transparent version at ITS CURRENT pixel size (so the files you already ship keep their dimensions).
Needs: pip install pillow numpy.  Method: un-matting. For every pixel, alpha = the smallest opacity that still lets the
original colour be a blend of foreground over #121014, so compositing back on #121014 reproduces the original (checked: max error 4/255),
and on #0c0f14 there is no box or fringe."""
import sys
import numpy as np
from PIL import Image

BG = np.array([18, 16, 20], dtype=np.float64)

def unmatte(img):
    a = np.asarray(img.convert('RGBA')).astype(np.float64)[..., :3]
    d = a - BG
    alpha = np.zeros(a.shape[:2])
    for c in range(3):
        alpha = np.maximum(alpha, np.maximum(d[..., c] / max(255 - BG[c], 1), -d[..., c] / max(BG[c], 1)))
    alpha = np.clip(alpha, 0, 1)
    alpha = np.where(alpha < 0.02, 0, alpha)
    fg = np.clip((a - (1 - alpha[..., None]) * BG) / np.maximum(alpha, 1e-6)[..., None], 0, 255)
    return Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    master = unmatte(Image.open(sys.argv[1]))
    for target in sys.argv[2:]:
        size = Image.open(target).size
        master.resize(size, Image.LANCZOS).save(target)
        print('wrote', target, size)
