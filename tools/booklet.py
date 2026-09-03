#!/usr/bin/env python3
"""Publish a लोकसंकल्प booklet PDF as an on-page reader.

Every booklet goes through the same three steps, so they live here rather
than being redone by hand each time:

  1. Shrink the PDF losslessly, and refuse to keep the result unless every
     page still renders pixel-for-pixel identical to the original.
  2. Render each page to WebP. The booklets embed fonts with broken Unicode
     maps, so copying the text out yields mojibake ("नशा मुत भारत अभयान") and
     pages are published as images and the PDF stays downloadable.
  3. Write <slug>-pustika.html, add the sitemap entry, and print the card
     markup to drop into संसाधन (and anywhere else the booklet belongs).

The reader page borrows its header, footer and scripts from a live page of
the site at build time, so a change to the menu or footer reaches every
booklet on the next build instead of leaving the templates behind.

    python3 tools/booklet.py booklets/<slug>.json path/to/source.pdf

See booklets/README.md for the shape of the JSON.
"""
import hashlib
import json
import pathlib
import re
import sys

import pymupdf

DPI = 150            # 595pt A4 -> 1240px wide; readable on a phone when zoomed
QUALITY = 72         # WebP; a dense text page lands around 70-90 KB
EAGER_PAGES = 2      # the rest wait until the reader scrolls to them
SITE = "https://technotaau.github.io/loksankalp-1"

SAVE_OPTS = dict(garbage=4, deflate=True, deflate_images=True,
                 deflate_fonts=True, clean=True)


# --------------------------------------------------------------- helpers
def page_hashes(doc, dpi=110):
    return [hashlib.md5(doc[i].get_pixmap(dpi=dpi).samples).hexdigest()
            for i in range(doc.page_count)]


def sub_once(text, old, new, n=1):
    if text.count(old) != n:
        raise SystemExit(f"expected {n} occurrence(s) of {old[:70]!r}, "
                         f"found {text.count(old)}")
    return text.replace(old, new)


# ------------------------------------------------------------ 1. the PDF
def compress(src, dest):
    """Shrink losslessly. Anything that changes a pixel is rejected.

    Almost all of the saving is structural: these booklets repeat the logo
    and watermark on every page, and re-deflating with the duplicates
    collapsed takes the file to roughly a fifth of its size. Resampling the
    images on top of that was measured at under 5% further saving for a
    visible loss, so it is deliberately not done.
    """
    original = pymupdf.open(src)
    before = pathlib.Path(src).stat().st_size
    reference = page_hashes(original)

    doc = pymupdf.open(src)
    doc.subset_fonts(verbose=False)
    tmp = dest.with_suffix(".tmp.pdf")
    doc.save(tmp, **SAVE_OPTS)

    shrunk = pymupdf.open(tmp)
    if shrunk.page_count != original.page_count:
        tmp.unlink()
        raise SystemExit("compression changed the page count, refusing")
    if page_hashes(shrunk) != reference:
        tmp.unlink()
        raise SystemExit("compression changed how a page renders, refusing")

    after = tmp.stat().st_size
    if after < before:
        tmp.replace(dest)
        print(f"  pdf  {before/1048576:.2f} MB -> {after/1048576:.2f} MB "
              f"({100 - after * 100 // before}% smaller, all "
              f"{original.page_count} pages verified identical)")
    else:
        tmp.unlink()
        dest.write_bytes(pathlib.Path(src).read_bytes())
        print(f"  pdf  {before/1048576:.2f} MB, already minimal")
    return original.page_count


# --------------------------------------------------------- 2. page images
def render(src, out_dir):
    doc = pymupdf.open(src)
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("p*.webp"):
        stale.unlink()
    total = 0
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=DPI)
        dest = out_dir / f"p{i:02d}.webp"
        pix.pil_save(dest, format="WEBP", quality=QUALITY, method=6)
        total += dest.stat().st_size
    print(f"  pages {doc.page_count} images at {pix.width}x{pix.height}px, "
          f"{total/1048576:.1f} MB total, {total//doc.page_count//1024} KB average")
    return doc.page_count, pix.width, pix.height


# ---------------------------------------------------------- 3. the reader
def shell(reference_page):
    """Header and footer, lifted from a real page so they never go stale."""
    html = pathlib.Path(reference_page).read_text(encoding="utf-8")
    head, rest = html.split("<main id=\"main\">", 1)
    _, tail = rest.split("</main>", 1)
    return head, "</main>" + tail


def head_for(head, b, slug):
    url = f"{SITE}/{slug}-pustika.html"
    # Titles like "मुख्य परिचय पुस्तिका" already say it; don't say it twice.
    named = b["title"] if "पुस्तिका" in b["title"] else f"{b['title']} | लोकसंकल्प पुस्तिका"
    swaps = [
        (r"<title>.*?</title>", f"<title>{named}</title>"),
        (r'<meta name="description" content=".*?">',
         f'<meta name="description" content="{b["meta_description"]}">'),
        (r'<link rel="canonical" href=".*?">',
         f'<link rel="canonical" href="{url}">'),
        (r'<meta property="og:title" content=".*?">',
         # og:site_name already carries the brand; repeating it here reads badly.
         f'<meta property="og:title" content="{named}">'),
        (r'<meta property="og:description" content=".*?">',
         f'<meta property="og:description" content="{b["og_description"]}">'),
        (r'<meta property="og:url" content=".*?">',
         f'<meta property="og:url" content="{url}">'),
    ]
    for pattern, replacement in swaps:
        head, n = re.subn(pattern, lambda _m: replacement, head, count=1, flags=re.S)
        if n != 1:
            raise SystemExit(f"reference page has no {pattern}")
    # A booklet lives under संसाधन, whatever page we borrowed the shell from.
    head = head.replace(' aria-current="page"', "")
    return sub_once(head, '<li><a href="sansadhan.html">',
                    '<li><a href="sansadhan.html" aria-current="page">')


def reader(b, slug, pages, pdf_href, pdf_size, head, tail):
    ic = 'assets/img/icons.svg#'
    quotes = "\n      ".join(f"<p>“{q}”</p>" for q in b["quotes"])
    toc = "\n".join(
        f'        <li><a href="#page-{p}"><span>{t}</span>'
        f'<span>पृष्ठ {p}</span></a></li>' for t, p in b["toc"])
    figures = []
    for n in range(1, pages + 1):
        loading = ('fetchpriority="high"' if n <= EAGER_PAGES
                   else 'loading="lazy"')
        figures.append(
            f'      <figure class="doc-page" id="page-{n}">\n'
            f'        <img src="assets/docs/{slug}/p{n:02d}.webp"'
            f' alt="पुस्तिका का पृष्ठ {n}"\n'
            f'             width="1240" height="1755" {loading} decoding="async">\n'
            f'        <figcaption>पृष्ठ {n} / {pages}</figcaption>\n'
            f'      </figure>')
    # "1013 KB" reads worse than "1 MB" to someone deciding whether to tap.
    size = (f"{pdf_size/1048576:.1f} MB".replace(".0 MB", " MB")
            if pdf_size >= 972800 else f"{pdf_size//1024} KB")

    return f"""{head}<main id="main">

<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="ब्रेडक्रम्ब">
      <ol>
        <li><a href="index.html">होम</a></li>
        <li><a href="sansadhan.html">संसाधन</a></li>
        <li>{b['title']}</li>
      </ol>
    </nav>
    <p class="eyebrow">{b['eyebrow']}</p>
    <h1>{b['title']}</h1>
    <p class="lead">{b['subtitle']}</p>
  </div>
</section>

<section class="section" style="padding-block:clamp(1.6rem,3.5vw,2.4rem)">
  <div class="wrap stack">
    <div class="callout">
      {quotes}
    </div>
    <p class="cluster">
      <a class="btn btn--primary btn--lg" href="{pdf_href}" download>
        <svg aria-hidden="true"><use href="{ic}ic-download"></use></svg>PDF डाउनलोड करें
      </a>
      <a class="btn btn--ghost" href="{pdf_href}" target="_blank" rel="noopener">
        <svg aria-hidden="true"><use href="{ic}ic-external"></use></svg>नई विंडो में खोलें
      </a>
      <a class="btn btn--ghost" href="sansadhan.html">
        <svg aria-hidden="true"><use href="{ic}ic-resource"></use></svg>सभी संसाधन
      </a>
    </p>
    <p class="form-note">{pages} पृष्ठ · PDF लगभग {size} · छापकर सभा और बैठक में बाँटी जा सकती है।</p>
  </div>
</section>

<section class="section section--tint" aria-labelledby="suchi">
  <div class="wrap stack">
    <h2 id="suchi">विषय-सूची</h2>
    <p>किसी भी अध्याय पर टैप करके सीधे उस पृष्ठ पर पहुँचें।</p>
    <ol class="doc-toc">
{toc}
    </ol>
  </div>
</section>

<section class="section" aria-labelledby="padhein">
  <div class="wrap stack">
    <h2 id="padhein" class="visually-hidden">पुस्तिका पढ़ें</h2>
    <div class="doc-pages">
{chr(10).join(figures)}
    </div>
    <div class="doc-actions">
      <a class="btn btn--primary" href="{pdf_href}" download>
        <svg aria-hidden="true"><use href="{ic}ic-download"></use></svg>PDF डाउनलोड
      </a>
      <a class="btn btn--ghost" href="sansadhan.html">
        <svg aria-hidden="true"><use href="{ic}ic-resource"></use></svg>सभी संसाधन
      </a>
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap center stack">
    <h2>आगे क्या करें</h2>
    <p style="margin-inline:auto">पुस्तिका पढ़ने के बाद अपना संकल्प लें, या अपने गाँव में ग्राम सभा की तैयारी करें।</p>
    <p class="cluster cluster--center">
      <a class="btn btn--primary" href="mera-sankalp.html">संकल्प लें</a>
      <a class="btn btn--ghost" href="good-parenting.html">Good Parenting केंद्र</a>
      <a class="btn btn--ghost" href="sansadhan.html">सभी संसाधन</a>
    </p>
  </div>
</section>

{tail}"""


# ------------------------------------------------------------ 4. sitemap
def sitemap(slug, today):
    path = pathlib.Path("sitemap.xml")
    xml = path.read_text(encoding="utf-8")
    loc = f"{SITE}/{slug}-pustika.html"
    entry = (f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{today}</lastmod>\n"
             f"    <changefreq>monthly</changefreq>\n"
             f"    <priority>0.8</priority>\n  </url>\n")
    if loc in xml:
        xml = re.sub(r"  <url>\s*<loc>" + re.escape(loc) + r"</loc>.*?</url>\n",
                     entry, xml, count=1, flags=re.S)
        print("  sitemap entry refreshed")
    else:
        xml = xml.replace("</urlset>", entry + "</urlset>")
        print("  sitemap entry added")
    path.write_text(xml, encoding="utf-8")


def card(b, slug, pages, pdf_href):
    ic = 'assets/img/icons.svg#'
    return f"""        <div class="card card--doc card--saffron">
          <div class="card__ic"><svg aria-hidden="true"><use href="{ic}ic-book"></use></svg></div>
          <h4><a href="{slug}-pustika.html">{b['title']}</a></h4>
          <p>{b['card_blurb']}</p>
          <p>{pages} पृष्ठ · हिंदी · निःशुल्क</p>
          <p class="card__actions">
            <a class="btn btn--primary" href="{slug}-pustika.html">
              <svg aria-hidden="true"><use href="{ic}ic-book"></use></svg>ऑनलाइन पढ़ें
            </a>
            <a class="btn btn--ghost" href="{pdf_href}" download>
              <svg aria-hidden="true"><use href="{ic}ic-download"></use></svg>PDF
            </a>
          </p>
        </div>"""


def main(config_path, source_pdf):
    b = json.loads(pathlib.Path(config_path).read_text(encoding="utf-8"))
    slug = b["slug"]
    print(f"{b['title']}  ({slug})")

    pdf = pathlib.Path(f"assets/docs/loksankalp-{slug}.pdf")
    pdf.parent.mkdir(parents=True, exist_ok=True)
    compress(source_pdf, pdf)
    pages, _, _ = render(pdf, pathlib.Path(f"assets/docs/{slug}"))

    head, tail = shell(b.get("reference_page", "sansadhan.html"))
    html = reader(b, slug, pages, str(pdf).replace("\\", "/"),
                  pdf.stat().st_size, head_for(head, b, slug), tail)
    out = pathlib.Path(f"{slug}-pustika.html")
    out.write_text(html, encoding="utf-8")
    print(f"  page  {out}")

    sitemap(slug, b["lastmod"])
    print("\ncard markup for संसाधन:\n")
    print(card(b, slug, pages, str(pdf).replace("\\", "/")))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
