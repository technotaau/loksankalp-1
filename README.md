# लोकसंकल्प — Loksankalp

> **नशे की सामाजिक स्वीकृति के विरुद्ध जनआंदोलन**
> “नशे को नहीं, संस्कारों को सामाजिक स्वीकृति”
> संकल्प • सहभागिता • संवाद • परिवर्तन

A public campaign website for a people's movement against the *social acceptance*
of intoxicants. Built for the audience it actually serves: villagers, schoolteachers
and students in Rajasthan, most of them on inexpensive Android phones over 3G.

**Picking up the work?** Read **[`docs/STATE.md`](docs/STATE.md)** first — it is the
running record of where everything stands, what is deployed, which dates are live,
what is still open, and which mistakes have already been made once.

## Design principles

1. **Three journeys, not a menu.** Everything funnels into
   *मैं संकल्प लेना चाहता हूँ* · *मैं ग्राम सभा करना चाहता हूँ* · *मुझे सहायता चाहिए*.
   They sit under the hero, and as a sticky bottom bar on every mobile screen.
2. **Readable first.** 17px+ Devanagari body text, 1.85 line-height, 48px minimum
   tap targets, 4.5:1 minimum contrast.
3. **Impact on open.** The first screen is the logo, the name, the tagline and one
   action — nothing else competing for attention.
4. **Nothing is more than two clicks away.**
5. **Dignified language.** Stigma-free throughout — "नशे से प्रभावित व्यक्ति",
   never "नशेड़ी". *व्यक्ति नहीं, नशा समस्या है।*

## Tech

Deliberately plain: **hand-written HTML, one CSS file, one small JS file.**
No framework, no build step, no bundler, no npm install.

| Concern | Approach |
|---|---|
| Speed | ~40 KB of CSS+JS total, gzipped well under that. Illustrations are SVG; photographs are served as `<picture>` with WebP and JPEG at two widths, lazy-loaded below the fold. |
| SEO | Per-page `<title>`/description/canonical, Open Graph + Twitter cards, `schema.org/NGO` JSON-LD, `sitemap.xml`, `robots.txt`, semantic landmarks, `lang="hi"`. |
| Accessibility | Skip link, one `<h1>` per page, labelled form controls, `aria-current`, visible focus rings, `prefers-reduced-motion` respected, keyboard-operable nav. |
| Resilience | Progressive enhancement — every page is fully usable with JavaScript off. |
| Offline-ish | `site.webmanifest` makes it installable to the home screen with app shortcuts. |
| Fonts | Google Fonts with `display=swap` and `preconnect`; system Devanagari fallback so text renders instantly. |

## Layout

```
index.html              होम — hero, three journeys, counters, four pillars, all sections
mera-sankalp.html       संकल्प form + digital certificate
gram-sabha.html         ग्राम सभा guide, समिति, report upload
good-parenting.html     Good Parenting केंद्र — 5 सूत्र, warning signs
yuva-manch.html         युवा शक्ति मंच — positive alternatives, club registration
sahayata-kendra.html    नशा मुक्ति सहायता केंद्र — help first, explanation second
shikshak-network.html   शिक्षक परिवर्तन नेटवर्क — registration, school plan
safalta-kahaniyan.html  सफलता कहानी मंच — stories + submission form
sansadhan.html          ज्ञान एवं संसाधन केंद्र — downloads + FAQ
dashboard.html          डैशबोर्ड — राज्य → जिला → ब्लॉक → गाँव
samman.html             सम्मान एवं प्रेरणा — award categories + nomination
sankalp-21.html         संकल्प 21 पंजीकरण + करुणा 21 (फ़ोटो, प्रमाणपत्र, साझा)
gallery.html            अभियान की तस्वीरें
*-pustika.html          16 पुस्तिकाएँ, सामग्री booklets/*.json से — docs/BOOKLETS.md
login.html              समिति / शिक्षक लॉगिन
404.html                पृष्ठ नहीं मिला
css/tokens.css          design tokens (colour, type scale, spacing)
css/site.css            the entire stylesheet
js/site.js              nav, counters, scroll reveal, demo form handling
assets/img/             logo, icon sprite, hero illustration, OG card
assets/img/photos/      campaign photographs + responsive WebP/JPEG variants
tools/check.py          QC harness (structure, links, a11y, SEO, images, SVG validity)
tools/check-form-endpoint.sh  is the deployed Apps Script live, and is it current?
tools/optimize_photos.py generates the responsive photo variants
tools/booklet.py        builds the पुस्तिका pages from booklets/*.json
docs/STATE.md           where everything stands today — read this first
js/config.js            the one line to paste the form endpoint into
google-apps-script/     form receiver: Google Sheet rows + Drive uploads
```

## Run it locally

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

## Quality gate

```bash
python3 tools/check.py
```

Validates HTML well-formedness, `lang`, single `<h1>`, heading order, every internal
link and anchor, every icon id against the sprite, `alt` on images, a `<label>` for
every form control, title/description/canonical, SVG validity, and sitemap coverage.
CI runs it before every deploy — see `.github/workflows/deploy.yml`.

## Before going live

The site ships with **marked placeholders** wherever real data is needed. Search for
`placeholder-note` and `href="#"` to find them all:

- [x] Contact email — info@loksankalp.org (footer, सहायता केंद्र, JSON-LD)
- [x] Social media accounts — YouTube, Facebook, Instagram, X (footer, home follow row, JSON-LD `sameAs`)
- [x] The campaign emblem — full circular seal in the footer, mark in the header
- [x] Live figures for the impact counters and `dashboard.html` — counted from the Sheet
- [x] Campaign photographs — `assets/img/photos/`, see `docs/PHOTOS.md`
- [x] Downloadable material in `sansadhan.html` — 16 पुस्तिकाएँ as pages, `docs/BOOKLETS.md`
- [x] Form receiver deployed, URL in `js/config.js` — see `docs/FORMS.md`
- [ ] Helpline number. Until one exists the footer says "जल्द उपलब्ध होगी" and the
      सहायता केंद्र buttons point at the email — never at a placeholder `tel:` link,
      which would have dialled 00000 for someone in distress
- [ ] Real success stories (all current story cards are structural examples)
- [ ] Dungar College logo for the करुणा 21 certificate
- [ ] Interactive Rajasthan district map on `dashboard.html`

## Deploy

**Live: https://loksankalp.org/** — GitHub Pages, custom domain, HTTPS enforced.

Pages source is **GitHub Actions**, not a branch. A push to the default branch
runs `.github/workflows/deploy.yml`, which validates the site with
`tools/check.py` and then publishes it. A failing check blocks the deploy.
Nothing is manual, and a broken site never reaches the public.

The root `CNAME` file holds `loksankalp.org`. With an Actions-based deploy the
custom domain is not remembered by the repository settings alone — that file is
what keeps it attached on every publish, so do not delete it.

`tools/check.py` also refuses any absolute `github.io` link and checks that
`CNAME` is present and correct, so a stale host cannot creep back into a page.

### Two pieces of leftover tidying

- The **default branch is still `claude/website-hindi-content-build-f4hhg9`**,
  and the workflow names it explicitly under `branches:`. The `github-pages`
  environment rejects every ref except the default branch, so if you switch the
  default to `main`, change that list in the same commit — otherwise deploys
  stop silently.
- The `gh-pages` branch is left over from the earlier branch-source setup and is
  no longer used. It can be deleted.

If the canonical domain changes, update `CNAME`, the `canonical` and `og:url`
tags in each page's `<head>`, `SITE_HOST` in `tools/check.py`, plus `sitemap.xml`
and `robots.txt`.
