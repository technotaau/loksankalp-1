#!/usr/bin/env python3
"""Build the photo gallery page, and add photographs to it.

Photographs sent in through the forms land in Google Drive. Drive is a poor
image host for this site: embedding needs the file made public, which also
publishes the original with its EXIF GPS, and it serves no WebP and no small
sizes, so a village phone would pull the full JPEG. Approved photographs are
therefore copied into the repository, where the same pipeline as every other
photograph gives them 760px and 1400px WebP.

    python3 tools/gallery.py add photo.jpg \
        --caption "सभा में सामूहिक संकल्प" \
        --alt "हाथ उठाकर संकल्प लेते ग्रामवासी" \
        --jila बीकानेर [--gaon खारा] [--date 2026-09] [--bhej "ग्राम समिति, खारा"]

    python3 tools/gallery.py build     # regenerate gallery.html from the manifest

Adding a photograph strips its EXIF, which is not optional: a phone records
the exact spot a picture was taken, and a school's coordinates are nobody
else's business.
"""

import argparse
import html
import json
import pathlib
import re
import subprocess
import sys

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "gallery" / "photos.json"
PHOTOS = ROOT / "assets" / "img" / "photos"
PAGE = ROOT / "gallery.html"
SITE = "https://technotaau.github.io/loksankalp-1"
REFERENCE = "sansadhan.html"          # header and footer are lifted from here


# ------------------------------------------------------------------ manifest
def load():
    return json.loads(MANIFEST.read_text(encoding="utf-8"))["photos"]


def save(photos):
    MANIFEST.write_text(
        json.dumps({"photos": photos}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "photo"


# ----------------------------------------------------------------- adding one
def add(args):
    src = pathlib.Path(args.image)
    if not src.exists():
        raise SystemExit(f"no such file: {src}")

    slug = slugify(args.slug or src.stem)
    dest = PHOTOS / f"{slug}.jpg"
    if dest.exists() and not args.replace:
        raise SystemExit(f"{dest.name} already exists; pass --replace to overwrite")

    with Image.open(src) as im:
        # Rotate first, while the orientation tag is still there, then drop
        # every tag by copying the pixels into a fresh image.
        im = ImageOps.exif_transpose(im).convert("RGB")
        clean = Image.new("RGB", im.size)
        clean.paste(im)
        clean.save(dest, "JPEG", quality=92, optimize=True)

    if Image.open(dest).getexif():
        raise SystemExit("EXIF survived the copy; refusing to publish")

    subprocess.run([sys.executable, str(ROOT / "tools" / "optimize_photos.py")],
                   cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

    photos = [p for p in load() if p["file"] != slug]
    photos.insert(0, {                       # newest first
        "file": slug,
        "caption": args.caption,
        "alt": args.alt or args.caption,
        "jila": args.jila or "",
        "gaon": args.gaon or "",
        "date": args.date or "",
        "bhej": args.bhej or "",
    })
    save(photos)
    print(f"added {slug}  ({dest.stat().st_size // 1024} KB source, EXIF removed)")
    build(args)


# -------------------------------------------------------------- page building
def shell():
    """Header and footer, lifted from a real page so they never go stale."""
    page = (ROOT / REFERENCE).read_text(encoding="utf-8")
    head, rest = page.split('<main id="main">', 1)
    _, tail = rest.split("</main>", 1)
    return head, "</main>" + tail


def head_for(head):
    url = f"{SITE}/gallery.html"
    title = "तस्वीरें | लोकसंकल्प"
    desc = ("लोकसंकल्प की तस्वीरें : ग्राम/वार्ड सभा, ट्रैक्टर रैली, सामूहिक संकल्प, "
            "मानव शृंखला और विद्यालयों की भागीदारी के दृश्य।")
    head = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head, count=1, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*(")',
                  lambda m: m.group(1) + desc + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                  lambda m: m.group(1) + title + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
                  lambda m: m.group(1) + desc + m.group(2), head, count=1)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                  lambda m: m.group(1) + url + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*(")',
                  lambda m: m.group(1) + url + m.group(2), head, count=1)
    # the nav marks whichever page you are on
    head = head.replace(' aria-current="page"', "")
    head = head.replace('<a href="gallery.html">', '<a href="gallery.html" aria-current="page">')
    return head


MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
          "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]


def when(value):
    m = re.match(r"^(\d{4})-(\d{2})(?:-(\d{2}))?$", value or "")
    if not m:
        return ""
    year, month, day = m.group(1), int(m.group(2)), m.group(3)
    if not 1 <= month <= 12:
        return ""
    name = MONTHS[month - 1]
    return f"{int(day)} {name} {year}" if day else f"{name} {year}"


def figure(p):
    f, e = p["file"], html.escape
    where = " · ".join(x for x in (p.get("gaon"), p.get("jila")) if x)
    meta = " · ".join(x for x in (where, when(p.get("date"))) if x)
    if p.get("bhej"):
        meta = (meta + " · " if meta else "") + "भेजा : " + e(p["bhej"])
    with Image.open(PHOTOS / f"{f}-1400.jpg") as im:
        w, h = im.size
    return (
f'''      <figure class="photo" data-jila="{e(p.get("jila", ""))}">
        <a href="assets/img/photos/{f}-1400.jpg">
          <picture>
            <source type="image/webp" media="(max-width: 760px)" srcset="assets/img/photos/{f}-760.webp">
            <source type="image/webp" srcset="assets/img/photos/{f}-1400.webp">
            <img src="assets/img/photos/{f}-1400.jpg" alt="{e(p["alt"])}" width="{w}" height="{h}" loading="lazy" decoding="async">
          </picture>
        </a>
        <figcaption>{e(p["caption"])}{f'<span class="photo__meta">{meta}</span>' if meta else ""}</figcaption>
      </figure>
''')


def build(_args=None):
    photos = load()
    missing = [p["file"] for p in photos
               if not (PHOTOS / f"{p['file']}-1400.jpg").exists()]
    if missing:
        raise SystemExit("no generated sizes for: " + ", ".join(missing))

    head, tail = shell()
    jilas = sorted({p["jila"] for p in photos if p.get("jila")})
    # One district means the filter can only ever say "all", so it is left out.
    filter_block = ""
    if len(jilas) > 1:
        chips = "".join(
            f'<button type="button" class="chip chip--filter" data-filter="{html.escape(j)}">{html.escape(j)}</button>\n        '
            for j in jilas)
        filter_block = (
            '    <div class="filters" data-gallery-filters hidden>\n'
            '      <span class="filters__label">जिला :</span>\n'
            '      <button type="button" class="chip chip--filter is-on" data-filter="">सभी</button>\n'
            f'      {chips}</div>\n')

    body = f'''<main id="main">

<section class="page-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="ब्रेडक्रम्ब">
      <ol>
        <li><a href="index.html">होम</a></li>
        <li aria-current="page">तस्वीरें</li>
      </ol>
    </nav>
    <p class="eyebrow">अभियान की झलक</p>
    <h1>तस्वीरें</h1>
    <p class="lead">गाँव, वार्ड और विद्यालयों से भेजी गई तस्वीरें</p>
  </div>
</section>

<section class="section">
  <div class="wrap stack">
    <p>ये तस्वीरें ग्राम/वार्ड सभा, ट्रैक्टर रैली, सामूहिक संकल्प और विद्यालयों के कार्यक्रमों की हैं। किसी भी तस्वीर पर टैप करके उसे बड़ा देखा जा सकता है।</p>
    <p class="form-note">अपनी सभा या कार्यक्रम की तस्वीरें भेजने के लिए <a href="gram-sabha.html#report">सभा की रिपोर्ट</a> भेजें, या <a href="safalta-kahaniyan.html#saajha">अपनी कहानी</a> के साथ जोड़ें।</p>
  </div>
</section>

<section class="section section--tint" aria-labelledby="tasveeren">
  <div class="wrap">
    <div class="section-head">
      <h2 id="tasveeren" class="visually-hidden">तस्वीरें</h2>
    </div>
{filter_block}    <div class="photo-grid" data-gallery>
{"".join(figure(p) for p in photos)}    </div>
    <p class="center mt-2" data-gallery-empty hidden>इस जिले की तस्वीरें अभी नहीं आई हैं।</p>
  </div>
</section>

<section class="section">
  <div class="wrap section-head">
    <p class="eyebrow">अगला कदम</p>
    <h2>आपके गाँव या वार्ड की तस्वीर यहाँ हो सकती है</h2>
    <p>सभा कीजिए, रिपोर्ट भेजिए, और अपने गाँव/शहर का काम पूरे राज्य के सामने रखिए।</p>
    <p class="cluster cluster--center mt-2">
      <a class="btn btn--primary btn--lg" href="gram-sabha.html">
        <svg aria-hidden="true"><use href="assets/img/icons.svg#ic-village"></use></svg>ग्राम/वार्ड सभा आयोजित करें
      </a>
      <a class="btn btn--ghost btn--lg" href="safalta-kahaniyan.html">
        <svg aria-hidden="true"><use href="assets/img/icons.svg#ic-story"></use></svg>अपनी कहानी भेजें
      </a>
    </p>
  </div>
</section>

'''
    PAGE.write_text(head_for(head) + body + tail, encoding="utf-8")
    print(f"gallery.html written: {len(photos)} photo(s), {len(jilas)} district(s)")
    sitemap()


def sitemap():
    path = ROOT / "sitemap.xml"
    xml = path.read_text(encoding="utf-8")
    loc = f"{SITE}/gallery.html"
    if loc in xml:
        return
    entry = (f"  <url>\n    <loc>{loc}</loc>\n"
             f"    <lastmod>2026-09-05</lastmod>\n"
             f"    <changefreq>weekly</changefreq>\n"
             f"    <priority>0.7</priority>\n  </url>\n")
    path.write_text(xml.replace("</urlset>", entry + "</urlset>"), encoding="utf-8")
    print("  sitemap entry added")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add", help="add one photograph and rebuild the page")
    a.add_argument("image")
    a.add_argument("--caption", required=True)
    a.add_argument("--alt", default="")
    a.add_argument("--jila", default="")
    a.add_argument("--gaon", default="")
    a.add_argument("--date", default="", help="YYYY-MM or YYYY-MM-DD")
    a.add_argument("--bhej", default="", help="who sent it, for the credit line")
    a.add_argument("--slug", default="", help="file name to use; defaults to the image's")
    a.add_argument("--replace", action="store_true")
    a.set_defaults(func=add)

    b = sub.add_parser("build", help="regenerate gallery.html from the manifest")
    b.set_defaults(func=build)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
