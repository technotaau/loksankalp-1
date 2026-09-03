# पुस्तिका प्रकाशन — publishing a booklet

Every booklet on the site is published the same way, so one command does it:

```
python3 tools/booklet.py booklets/<slug>.json path/to/source.pdf
```

That produces, all from the one source PDF:

| what | where |
| --- | --- |
| the compressed PDF | `assets/docs/loksankalp-<slug>.pdf` |
| one image per page | `assets/docs/<slug>/pNN.webp` |
| the reader page | `<slug>-pustika.html` |
| the sitemap entry | `sitemap.xml` |
| card markup to paste | printed to the terminal |

Placing that card is the only manual step, because which section a booklet
belongs in — and which "फ़ाइल शीघ्र उपलब्ध" placeholder it replaces — is a
decision, not a rule. Paste it into `sansadhan.html`, and into the relevant
topic page (`good-parenting.html`, `shikshak-network.html`, …) if it has a
सामग्री section.

Afterwards, always:

```
python3 tools/check.py     # links, anchors, headings, alt text, SEO tags
```

## Why pages are published as images

These booklets embed fonts whose Unicode maps are broken. Copying text out of
them yields mojibake — "नशा मुत भारत अभयान" instead of "नशा मुक्त भारत अभियान"
— so a transcribed HTML version would be wrong in ways that are hard to spot
and impossible to search usefully. Rendering each page as an image keeps the
booklet exactly as its authors laid it out, and the PDF stays downloadable for
anyone who wants to print it.

The cost is that page text is not selectable or indexable. If a booklet ever
arrives with a clean text layer, that one is worth building as real HTML
instead.

## Compression

`tools/booklet.py` shrinks the PDF and then **refuses to keep the result**
unless all pages still render pixel-for-pixel identical to the original. So
the size drop is free: nothing is resampled, re-encoded or thrown away.

Nearly all of the saving is structural. These booklets repeat the logo and
watermark on every page and store some images twice over; collapsing the
duplicates and re-deflating took the संगति booklet from 4.88 MB to 0.99 MB.

Going further was measured and rejected. Resampling the images down to 300 DPI
saved under 5% more and introduced visible artefacts; at 150 DPI it saved
280 KB but degraded the pages and ruined them for printing. Since the whole
point is that a village school can print these, lossless is where it stops.

## Page images

150 DPI (1240×1755 for A4), WebP quality 72 — about 70 KB for a dense text
page, and readable when zoomed on a phone. Only the first two load eagerly;
the rest wait until the reader scrolls to them, so someone who reads five
pages of a 74-page booklet downloads roughly 350 KB, not 5 MB.

## The config file

`booklets/<slug>.json`:

| field | notes |
| --- | --- |
| `slug` | used for filenames and the URL — lowercase, hyphens |
| `lastmod` | sitemap date, `YYYY-MM-DD` |
| `title` | `<h1>`, breadcrumb, card heading |
| `subtitle` | the lead line under the title |
| `eyebrow` | small line above the title |
| `meta_description`, `og_description` | search results and link previews |
| `card_blurb` | the sentence on the संसाधन card |
| `quotes` | pulled from the booklet's आवरण संदेश, shown in the callout |
| `toc` | `[["अध्याय 1 : …", 5], …]`, chapter title and its **printed** page |
| `reference_page` | optional; the page to copy header/footer from |

`toc` is the only part that needs reading the booklet. The printed page number
and the PDF page number line up in these booklets — check the footer of a page
to confirm before assuming it for a new one.

Reproduce a contents page exactly as printed, including any oddity. The संगति
booklet numbers its chapters 14, 16, 17 with no 15; that is reproduced rather
than silently corrected, so the site and the printed PDF agree.

## Header and footer

The reader page copies its header, navigation, footer and scripts from a real
page of the site (`sansadhan.html` by default) at build time. So a menu or
footer change made anywhere reaches every booklet the next time it is built —
there is no separate template to keep in step.

Re-running the command on an existing booklet is safe and idempotent: it
rebuilds in place, refreshes the sitemap entry rather than adding a second one,
and clears out stale page images if the PDF got shorter.
