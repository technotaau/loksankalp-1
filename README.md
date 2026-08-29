# लोकसंकल्प — Loksankalp

> **नशे की सामाजिक स्वीकृति के विरुद्ध जनआंदोलन**
> “नशे को नहीं, संस्कारों को सामाजिक स्वीकृति”
> संकल्प • सहभागिता • संवाद • परिवर्तन

A public campaign website for a people's movement against the *social acceptance*
of intoxicants. Built for the audience it actually serves: villagers, schoolteachers
and students in Rajasthan, most of them on inexpensive Android phones over 3G.

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
| Speed | ~40 KB of CSS+JS total, gzipped well under that. SVG-only imagery — no photos to download. |
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
login.html              समिति / शिक्षक लॉगिन
404.html                पृष्ठ नहीं मिला
css/tokens.css          design tokens (colour, type scale, spacing)
css/site.css            the entire stylesheet
js/site.js              nav, counters, scroll reveal, demo form handling
assets/img/             logo, icon sprite, hero illustration, OG card
tools/check.py          QC harness (structure, links, a11y, SEO, SVG validity)
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

- [ ] Helpline number, contact email, office address (footer + `sahayata-kendra.html`)
- [ ] Social media links (footer)
- [ ] The original logo artwork — `assets/img/logo.svg` is a hand-built recreation
- [ ] Real photographs for the hero and story cards
- [ ] Live figures for the impact counters and `dashboard.html`
- [ ] Real success stories (all current story cards are structural examples)
- [ ] Downloadable PDFs in `sansadhan.html`
- [ ] A backend for the forms — they currently show a confirmation panel client-side.
      `js/site.js` handles any `<form data-demo="…">`; point the `action` at a real
      endpoint and remove `data-demo` to switch over.
- [ ] Interactive Rajasthan district map on `dashboard.html`

## Deploy

Pushing to `main` publishes to GitHub Pages via `.github/workflows/deploy.yml`
(Settings → Pages → Source: **GitHub Actions**). Update the canonical/OG URLs in
each page's `<head>`, plus `sitemap.xml` and `robots.txt`, if the domain changes.
