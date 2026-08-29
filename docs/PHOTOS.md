# फ़ोटो — placement map

All campaign photographs live in `assets/img/photos/`. **Filenames below are exact** —
the markup is written against them, so a mismatched name shows a broken image.

## What to drop in

Save each original at the given name (JPEG, longest edge ≥ 1600px is plenty),
then run `tools/optimize-photos.sh` to generate the sized WebP/JPEG variants.

| # | Filename | The photograph | Where it goes |
|---|---|---|---|
| 1 | `rally-group-temple.jpg` | Large group outside the temple holding both rally banners, tricolour raised | **`index.html` hero background** — the first thing anyone sees |
| 2 | `tractor-rally-aerial.jpg` | Aerial: the tractor convoy strung out along the village road, banner on the lead trailer | `index.html` — अभियान की झलक lead; also `gram-sabha.html` |
| 3 | `gram-sabha-meeting.jpg` | Seated सभा under the shed, dignitaries on the stage, banner behind | **`gram-sabha.html` page header**; also the ग्राम सभा block on home |
| 4 | `sankalp-shapath.jpg` | Men standing on the green mats, arms outstretched, taking the संकल्प | **`mera-sankalp.html` page header**; also the संकल्प block on home |
| 5 | `yuva-flags-courtyard.jpg` | Youth crowd with tricolours in the temple courtyard | **`yuva-manch.html` page header** |
| 6 | `manav-shrinkhala-aerial.jpg` | Aerial: students standing in formation spelling out the campaign message | `yuva-manch.html` — युवा क्या कर सकते हैं |
| 7 | `vidyalaya-assembly-aerial.jpg` | Aerial: students seated in rows across the school ground | **`shikshak-network.html` page header** |
| 8 | `sabha-standing-crowd.jpg` | Standing crowd on the green mats under the shed | `gram-sabha.html` — सभा कैसे आयोजित करें |
| 9 | `sabha-ground-wide.jpg` | Wide open ground, participants spread out among the trees | `gram-sabha.html` — समिति section |
| 10 | `abhiyan-banner.jpg` | The rally banner in full with the speaker at the microphone | `index.html` — परिचय / अभियान details |

## Alt text and captions

Alt text describes the photograph for someone who cannot see it. Captions state
only what the banner in the frame actually says — no claim beyond that.

| Filename | `alt` | Caption |
|---|---|---|
| `rally-group-temple.jpg` | ग्राम्यजन, विद्यार्थी और शिक्षक मंदिर प्रांगण में नशामुक्ति रैली के बैनर के साथ, तिरंगा लहराते हुए | नशामुक्ति हेतु ट्रैक्टर रैली — श्री गुरु हंसोजी धाम |
| `tractor-rally-aerial.jpg` | गाँव की सड़क पर कतार में चलते ट्रैक्टर, आगे नशामुक्ति रैली का बैनर | ट्रैक्टर रैली में गाँव की भागीदारी |
| `gram-sabha-meeting.jpg` | ग्राम सभा में मंच पर बैठे अतिथि और सामने ज़मीन पर बैठे ग्रामवासी | ग्राम लोकसंकल्प सभा — सामूहिक संवाद |
| `sankalp-shapath.jpg` | पंक्ति में खड़े लोग हाथ आगे बढ़ाकर नशामुक्ति का संकल्प लेते हुए | सामूहिक संकल्प |
| `yuva-flags-courtyard.jpg` | तिरंगा थामे युवाओं का समूह मंदिर प्रांगण में | युवाओं की सहभागिता |
| `manav-shrinkhala-aerial.jpg` | विद्यालय के मैदान में विद्यार्थी पंक्तिबद्ध खड़े होकर संदेश की आकृति बनाते हुए, ऊपर से लिया गया दृश्य | विद्यार्थियों द्वारा मानव शृंखला |
| `vidyalaya-assembly-aerial.jpg` | विद्यालय के मैदान में कतारों में बैठे विद्यार्थी, ऊपर से लिया गया दृश्य | विद्यालय में नशामुक्ति संवाद |
| `sabha-standing-crowd.jpg` | शेड के नीचे हरी दरी पर खड़े ग्रामवासी | सभा में ग्रामवासियों की उपस्थिति |
| `sabha-ground-wide.jpg` | खुले मैदान में दूर-दूर खड़े प्रतिभागी, पीछे पेड़ और भवन | खुले मैदान में आयोजित सभा |
| `abhiyan-banner.jpg` | अभियान का बैनर और माइक पर बोलते वक्ता | अभियान का बैनर |

## Rules

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
