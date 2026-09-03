#!/usr/bin/env python3
"""Turn a booklet PDF into web-ready page images.

The booklets we publish embed fonts whose Unicode maps are broken, so copying
the text out produces mojibake ("नशा मुत भारत अभयान"). We therefore render each
page as an image instead of transcribing it. The PDF itself stays downloadable
for anyone who wants to print it.

    python3 tools/pdf_to_pages.py source.pdf assets/docs/<slug>

Also shrinks the PDF (drops unused objects, re-deflates streams) as long as the
result is genuinely smaller and has the same page count.
"""
import pathlib
import shutil
import subprocess
import sys

import pymupdf

DPI = 150          # 595pt A4 -> 1240px wide, readable on a phone when zoomed
QUALITY = 72       # webp; tuned so a text page lands around 60-80 KB


def render(pdf_path, out_dir):
    doc = pymupdf.open(pdf_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    sizes = []
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=DPI)
        dest = out_dir / f"p{i:02d}.webp"
        pix.pil_save(dest, format="WEBP", quality=QUALITY, method=6)
        sizes.append(dest.stat().st_size)
    w, h = pix.width, pix.height
    print(f"{len(sizes)} pages -> {out_dir}  {w}x{h}px  "
          f"total {sum(sizes)/1024/1024:.1f} MB  "
          f"avg {sum(sizes)/len(sizes)/1024:.0f} KB")
    return len(sizes), w, h


def slim(pdf_path, dest):
    doc = pymupdf.open(pdf_path)
    pages = doc.page_count
    tmp = dest.with_suffix(".tmp.pdf")
    doc.save(tmp, garbage=4, deflate=True, clean=True)
    original = pathlib.Path(pdf_path).stat().st_size
    if tmp.stat().st_size < original and pymupdf.open(tmp).page_count == pages:
        tmp.replace(dest)
        print(f"pdf {original/1024/1024:.1f} MB -> {dest.stat().st_size/1024/1024:.1f} MB")
    else:
        tmp.unlink()
        shutil.copy(pdf_path, dest)
        print(f"pdf copied unchanged, {original/1024/1024:.1f} MB")


if __name__ == "__main__":
    src, out = sys.argv[1], pathlib.Path(sys.argv[2])
    render(src, out)
