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
| `video-parichay`, `video-sabha`, `video-good-parenting`, `video-vivah`, `video-shok-sabha` | `sansadhan.html` वीडियो सामग्री cards. YouTube thumbnails, kept locally so a slow phone loads no third-party image. |

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

## तस्वीरें पृष्ठ (gallery.html)

`gallery.html` हाथ से नहीं लिखा जाता, `gallery/photos.json` से बनता है :

    python3 tools/gallery.py add सभा.jpg \
        --caption "खारा में ग्राम सभा" \
        --alt "सभा में बैठे ग्रामवासी" \
        --jila बीकानेर --gaon खारा --date 2026-09-04 \
        --bhej "ग्राम समिति, खारा"

    python3 tools/gallery.py build      # केवल पृष्ठ दोबारा बनाना हो तो

`add` तीन काम करता है : फ़ोटो को सीधा करता है (EXIF का orientation पढ़कर),
फिर **पूरा EXIF हटा देता है**, और 760/1400 वाले रूप बनाता है। EXIF हटाना
वैकल्पिक नहीं है : मोबाइल हर तस्वीर में उसका GPS स्थान लिखता है, और किसी
विद्यालय का सटीक स्थान सार्वजनिक करना ठीक नहीं।

फ़ॉर्म से आई तस्वीरें Drive में रहती हैं। Drive से सीधे दिखाना ठीक नहीं :
उसके लिए फ़ाइल को सार्वजनिक करना पड़ता है (यानी GPS सहित मूल फ़ाइल), वहाँ
WebP या छोटे आकार नहीं बनते, और कोई भी उस endpoint पर कुछ भी भेज सकता है।
इसलिए चुनी हुई तस्वीरें ही repo में आती हैं।

जिला फ़िल्टर तभी दिखता है जब दो या अधिक जिलों की तस्वीरें हों, और वह
जावास्क्रिप्ट से ही दिखाया जाता है, ताकि JS बंद होने पर सारी तस्वीरें
दिखती रहें।
