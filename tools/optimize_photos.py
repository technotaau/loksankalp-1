#!/usr/bin/env python3
"""Generate responsive variants for every photograph in assets/img/photos/.

For NAME.jpg produces NAME-800.webp, NAME-1600.webp and NAME-1600.jpg.
Pages use <picture> so a phone pulls the 800px WebP and a desktop the 1600px one.
Re-running is cheap: a variant newer than its source is left alone.

    python3 tools/optimize_photos.py [--force]
"""
import os, sys, glob
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'assets/img/photos')
# Crowd photographs are detail-dense and compress badly, so quality is tuned
# down until the large WebP lands near 100 KB. The 800px WebP is what a phone
# actually downloads; the JPEG exists only for browsers without WebP.
VARIANTS = [(760, 'webp', 72), (1400, 'webp', 70), (1400, 'jpg', 72)]
force = '--force' in sys.argv


def sources():
    for p in sorted(glob.glob(os.path.join(DIR, '*.jpg'))):
        stem = os.path.basename(p)[:-4]
        if any(stem.endswith(f'-{w}') for w, _, _ in VARIANTS):
            continue
        yield p, stem


def main():
    total = 0
    for src, stem in sources():
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            for width, fmt, q in VARIANTS:
                out = os.path.join(DIR, f'{stem}-{width}.{fmt}')
                if not force and os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
                    total += os.path.getsize(out)
                    continue
                v = im.copy()
                if v.width > width:
                    v = v.resize((width, round(v.height * width / v.width)), Image.LANCZOS)
                if fmt == 'webp':
                    v.save(out, 'WEBP', quality=q, method=6)
                else:
                    v.save(out, 'JPEG', quality=q, optimize=True, progressive=True)
                kb = os.path.getsize(out) / 1024
                total += os.path.getsize(out)
                flag = '  ← over 120 KB' if kb > 120 else ''
                print(f'  {os.path.basename(out):42} {kb:6.0f} KB{flag}')
    print(f'\nvariants total: {total/1024:.0f} KB')


if __name__ == '__main__':
    main()
