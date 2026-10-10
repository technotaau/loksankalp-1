#!/usr/bin/env python3
"""Rebuild the संरक्षक मंडल list on abhiyan-parivar.html from parivar/*.json.

Members, their introductions and their photographs arrive one at a time over
weeks. Editing eight blocks of markup by hand each time is how a stray tag or a
mismatched name gets in, so the names live in one data file and this writes the
markup between the two markers in the page.

    python3 tools/parivar.py

A member with "photo": "" shows their initials in the same circle instead, so
the page is never waiting on a picture. To add one, drop the file in
assets/img/parivar/ and put its name in "photo".
"""
import html, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'parivar/sanrakshak.json')
PAGE = os.path.join(ROOT, 'abhiyan-parivar.html')
PHOTOS = os.path.join(ROOT, 'assets/img/parivar')
START = '    <!-- सदस्य : tools/parivar.py से बनते हैं, हाथ से मत बदलिए -->'
END = '    <!-- /सदस्य -->'


def card(m):
    e = lambda t: html.escape(t, quote=True)
    cls = ' person--lead' if m.get('lead') else ''
    if m.get('photo'):
        src = 'assets/img/parivar/' + m['photo']
        if not os.path.exists(os.path.join(ROOT, src)):
            sys.exit('फ़ाइल नहीं मिली: ' + src)
        # alt is empty on purpose: the name is right beside it in text, and a
        # screen reader repeating it twice helps nobody.
        face = ('<img class="person__photo" src="%s" alt="" width="88" height="88" '
                'loading="lazy" decoding="async">' % e(src))
    else:
        face = '<span class="person__mono" aria-hidden="true">%s</span>' % e(m['mono'])
    bio = '\n          <p>%s</p>' % e(m['parichay']) if m.get('parichay') else ''
    return ('      <li class="person%s">\n'
            '        %s\n'
            '        <div class="person__about">\n'
            '          <b class="person__name">%s</b>\n'
            '          <span class="person__role">%s</span>%s\n'
            '        </div>\n'
            '      </li>') % (cls, face, e(m['naam']), e(m['pad']), bio)


def main():
    data = json.load(io.open(DATA, encoding='utf-8'))['sanrakshak']
    body = '\n'.join(card(m) for m in data)
    page = io.open(PAGE, encoding='utf-8').read()
    if START not in page or END not in page:
        sys.exit('abhiyan-parivar.html में सदस्यों वाले निशान नहीं मिले')
    page = re.sub(re.escape(START) + r'.*?' + re.escape(END),
                  lambda _: START + '\n' + body + '\n' + END, page, flags=re.S)
    io.open(PAGE, 'w', encoding='utf-8').write(page)
    withpic = sum(1 for m in data if m.get('photo'))
    print('%d सदस्य लिखे — %d के फोटो, %d के आद्याक्षर'
          % (len(data), withpic, len(data) - withpic))


main()
