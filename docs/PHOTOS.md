# फ़ोटो — placement map

All campaign photographs live in `assets/img/photos/`. **Filenames below are exact** —
the markup is written against them, so a mismatched name shows a broken image.

## What shipped where

Originals are `assets/img/photos/NAME.jpg`; `tools/optimize_photos.py` (Pillow, no
ImageMagick needed) generates `NAME-760.webp`, `NAME-1400.webp` and `NAME-1400.jpg`.
Pages use `<picture>`, so a phone pulls the 760px WebP — about 55 KB — and a desktop
the 1400px one.

| Filename | Placement |
|---|---|
| `rally-group-temple` | `index.html` hero background |
| `gram-sabha-meeting` | `gram-sabha.html` page header; ग्राम सभा block on home |
| `sankalp-shapath` | `mera-sankalp.html` page header; home gallery |
| `manch-shapath` | `mera-sankalp.html`, before संकल्प के बाद क्या |
| `yuva-flags-courtyard` | `yuva-manch.html` page header; home gallery |
| `manav-shrinkhala-aerial` | `yuva-manch.html`, before युवा क्या कर सकते हैं; home gallery |
| `vidyalaya-assembly` | `shikshak-network.html` page header; home gallery |
| `tractor-rally-aerial` | home gallery lead; `safalta-kahaniyan.html` page header |
| `tractor-rally-portrait` | `samman.html` page header |
| `sabha-standing-crowd` | `gram-sabha.html`, before सभा कैसे आयोजित करें; home gallery |
| `sabha-ground-wide` | `gram-sabha.html`, before the समिति section |
| `abhiyan-banner` | `sansadhan.html` page header |

One upload was a byte-identical duplicate and was dropped.

`video-abhiyan.jpg` is not a campaign photograph: it is the YouTube thumbnail for
"सामाजिक सरोकारों के साथ - नशा मुक्त भारत अभियान", stored locally so the video
cards do not hotlink to `i.ytimg.com`. Replace it if the video changes.

## Rules

0. **No credit / "आयोजक एवं सहयोगी" section.** Decided by the project owner.
   The organisations named on the banner in `abhiyan-banner.jpg` are not
   reproduced as site text, and no affiliation is claimed anywhere.
   The photograph may still be used — a banner visible inside a photograph is
   part of the scene, not a claim the site is making.
1. **No face is named.** These are photographs of identifiable private individuals at a
   public event. Captions describe the event, never a person.
2. **No invented claims.** A caption may repeat what the banner in the frame says and
   nothing more. Attendance figures, dates and outcomes are not inferred from a photo.
3. Every `<img>` carries `width`, `height`, real `alt`, and `loading="lazy"`
   (`fetchpriority="high"` instead for the hero). `tools/check.py` enforces the
   existence of every `src` and the presence of `alt`.

## Optimising

```bash
tools/optimize-photos.sh          # needs ImageMagick or cwebp; skips what is current
```
Produces, for each `NAME.jpg`: `NAME-800.webp`, `NAME-1600.webp`, `NAME-1600.jpg`.
Markup uses `<picture>` so phones pull the 800px WebP and desktops the 1600px one.
Target: no single photograph over ~120 KB at 1600px.
