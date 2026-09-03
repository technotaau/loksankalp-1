#!/usr/bin/env python3
"""लोकसंकल्प QC harness.

Runs every gate the project lead checks by hand, so CI can fail loudly:
structure, headings, internal links and anchors, icon ids, alt text,
form labels, SEO tags and SVG well-formedness.

Usage:  python3 tools/check.py [--quiet]
Exit code 1 if any ERROR is found. WARNs do not fail the build.
"""
import os, re, sys, glob
import xml.dom.minidom
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {'meta','link','img','br','hr','input','use','source','area','col',
        'embed','param','track','wbr','path','circle','rect','line','polygon',
        'polyline','ellipse','stop'}
errors, warns = [], []

def err(f, m): errors.append(f"{f}: {m}")
def warn(f, m): warns.append(f"{f}: {m}")


class Doc(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.mismatch = [], []
        self.headings, self.ids, self.links = [], set(), []
        self.imgs_no_alt, self.labels, self.inputs = 0, set(), []
        self.srcs, self.imgs_no_dims = [], 0
        self.icon_refs, self.h1 = [], 0
        self.title, self.in_title, self.desc, self.canonical = '', False, '', ''
        self.lang = ''
        self._text_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == 'html':
            self.lang = a.get('lang', '')
        if tag == 'title':
            self.in_title = True
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical = a.get('href', '')
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.headings.append(int(tag[1]))
            if tag == 'h1':
                self.h1 += 1
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'a' and 'href' in a:
            self.links.append(a['href'])
        if tag == 'img':
            if 'alt' not in a:
                self.imgs_no_alt += 1
            if a.get('src'):
                self.srcs.append(a['src'])
            if not (a.get('width') and a.get('height')):
                self.imgs_no_dims += 1
        if tag == 'source' and a.get('srcset'):
            self.srcs.extend(u.strip().split(' ')[0] for u in a['srcset'].split(','))
        if tag == 'use':
            h = a.get('href') or a.get('xlink:href') or ''
            if '#' in h:
                self.icon_refs.append(h.split('#')[1])
        if tag == 'label':
            if 'for' in a:
                self.labels.add(a['for'])
            self._text_depth += 1
        if tag in ('input', 'select', 'textarea'):
            if a.get('type') not in ('hidden', 'submit', 'button', 'reset'):
                self.inputs.append((a.get('id'), a.get('name'), a.get('type'),
                                    self._text_depth > 0, a.get('aria-label')))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'label':
            self._text_depth = max(0, self._text_depth - 1)
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            self.mismatch.append((tag, list(self.stack[-4:])))
            while self.stack and self.stack.pop() != tag:
                pass

    def handle_data(self, d):
        if self.in_title:
            self.title += d


def icon_ids():
    p = os.path.join(ROOT, 'assets/img/icons.svg')
    if not os.path.exists(p):
        return None
    return set(re.findall(r'<symbol[^>]*id="([^"]+)"', open(p, encoding='utf-8').read()))


def check_html(path, known_icons, page_ids):
    rel = os.path.relpath(path, ROOT)
    src = open(path, encoding='utf-8').read()
    d = Doc()
    d.feed(src)

    if d.stack:
        err(rel, f"unclosed tags: {d.stack}")
    for tag, ctx in d.mismatch:
        err(rel, f"mismatched </{tag}> (open: {ctx})")

    # --- structure ---
    if d.lang != 'hi':
        err(rel, f'<html lang> is "{d.lang}", expected "hi"')
    if d.h1 != 1:
        err(rel, f"{d.h1} <h1> elements, expected exactly 1")
    prev = 0
    for lv in d.headings:
        if prev and lv > prev + 1:
            warn(rel, f"heading level jumps h{prev} -> h{lv}")
        prev = lv

    # --- SEO ---
    if not d.title.strip():
        err(rel, "missing <title>")
    elif len(d.title) > 70:
        warn(rel, f"<title> is {len(d.title)} chars (>70)")
    if not d.desc:
        err(rel, "missing meta description")
    elif not (50 <= len(d.desc) <= 200):
        warn(rel, f"meta description is {len(d.desc)} chars")
    if not d.canonical:
        err(rel, "missing rel=canonical")

    # --- accessibility ---
    if d.imgs_no_alt:
        err(rel, f"{d.imgs_no_alt} <img> without alt")
    if d.imgs_no_dims:
        warn(rel, f"{d.imgs_no_dims} <img> without width/height (causes layout shift)")
    for img_src in d.srcs:                       # not `src`: that holds the page text
        if img_src.startswith(('http://', 'https://', 'data:')):
            continue
        sp = os.path.normpath(os.path.join(os.path.dirname(path), img_src))
        if not os.path.exists(sp):
            err(rel, f'image file missing -> {img_src}')
    for _id, name, _t, wrapped, aria in d.inputs:
        if wrapped or aria:
            continue
        if not _id or _id not in d.labels:
            err(rel, f'input name="{name}" id="{_id}" has no associated <label>')
    if 'skip-link' not in src:
        warn(rel, "no skip link")
    if 'action-bar' not in src:
        warn(rel, "no mobile action bar")

    # --- icons ---
    if known_icons is not None:
        for ref in set(d.icon_refs):
            if ref not in known_icons:
                err(rel, f'icon "#{ref}" not defined in assets/img/icons.svg')

    # --- links ---
    for href in d.links:
        if href.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:')):
            continue
        if href in ('#', ''):
            continue
        if href.startswith('#'):
            if href[1:] not in d.ids:
                err(rel, f'anchor "{href}" has no matching id on this page')
            continue
        target, _, frag = href.partition('#')
        tp = os.path.normpath(os.path.join(os.path.dirname(path), target))
        if not os.path.exists(tp):
            err(rel, f'broken link -> {href}')
        elif frag and tp.endswith('.html'):
            if frag not in page_ids.get(os.path.relpath(tp, ROOT), set()):
                err(rel, f'broken anchor -> {href}')

    return d


def check_svgs():
    for p in sorted(glob.glob(os.path.join(ROOT, 'assets/**/*.svg'), recursive=True)):
        rel = os.path.relpath(p, ROOT)
        try:
            xml.dom.minidom.parse(p)
        except Exception as e:
            err(rel, f"invalid SVG/XML: {e}")
        kb = os.path.getsize(p) / 1024
        if kb > 90:
            warn(rel, f"{kb:.0f} KB, large for an inline asset")


def main():
    quiet = '--quiet' in sys.argv
    pages = sorted(glob.glob(os.path.join(ROOT, '*.html')))
    if not pages:
        print("no HTML pages found"); return 1

    # first pass: collect ids per page so cross-page anchors can be verified
    page_ids = {}
    for p in pages:
        d = Doc(); d.feed(open(p, encoding='utf-8').read())
        page_ids[os.path.relpath(p, ROOT)] = d.ids

    known = icon_ids()
    if known is None:
        warn('assets/img/icons.svg', 'missing, icon references not verified')

    for p in pages:
        check_html(p, known, page_ids)
    check_svgs()

    for f in ('sitemap.xml', 'robots.txt', 'site.webmanifest', '.nojekyll',
              'css/site.css', 'css/tokens.css', 'js/site.js'):
        if not os.path.exists(os.path.join(ROOT, f)):
            err(f, 'missing')

    # every page must be listed in the sitemap
    sm = os.path.join(ROOT, 'sitemap.xml')
    if os.path.exists(sm):
        smtxt = open(sm, encoding='utf-8').read()
        for p in pages:
            name = os.path.basename(p)
            if name in ('404.html',):
                continue
            token = '/' if name == 'index.html' else '/' + name
            if token + '<' not in smtxt:
                warn('sitemap.xml', f'{name} not listed')

    if warns and not quiet:
        print(f"\n⚠  {len(warns)} warning(s)")
        for w in warns:
            print("   ", w)
    if errors:
        print(f"\n✖  {len(errors)} error(s)")
        for e in errors:
            print("   ", e)
        return 1
    print(f"\n✔  {len(pages)} page(s) passed all checks.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
