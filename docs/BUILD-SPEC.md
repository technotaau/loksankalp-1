# लोकसंकल्प — Page build spec (हर page agent इसे पढ़े)

`index.html` is the **reference implementation**. Read it before writing anything.

## Non-negotiables
1. **Copy the `<head>` boilerplate, the whole `<header class="site-header">`, the whole
   `<footer class="site-footer">` and the `<nav class="action-bar">` from `index.html` verbatim.**
   Change only: `<title>`, `<meta name="description">`, `og:title`, `og:description`,
   `og:url`, `<link rel="canonical">`, and move `aria-current="page"` onto the nav link
   for the current page (remove it from होम). Keep the JSON-LD block out of inner pages
   unless the spec for that page asks for one.
2. No new CSS files. Use only the classes already in `css/site.css` / `css/tokens.css`.
   If you truly need something new, append it to `css/site.css` under a
   `/* --- page: NAME --- */` comment — but try hard not to.
3. No frameworks, no external JS, no `<style>` blocks. Inline `style="…"` only for
   one-off colour tweaks, as `index.html` does sparingly.
4. Every page opens with `<section class="page-head">` containing breadcrumbs
   (`.crumbs`), an `.eyebrow`, an `<h1>` and one intro `<p class="lead">`.
5. Exactly one `<h1>` per page. Heading levels must not skip (h1 → h2 → h3).
6. Icons: `<svg aria-hidden="true"><use href="assets/img/icons.svg#ic-NAME"></use></svg>`.
   Available ids are listed in `assets/img/icons.svg`. Never invent an id — if the icon
   you want is missing, pick the closest existing one.
7. Images: always `width`, `height` and a real `alt` (or `alt=""` if decorative).
8. Forms: `data-demo="ID"` on the `<form>` plus a `hidden` result box with that `id`
   makes `js/site.js` show a success panel without a backend. Every input needs a
   `<label>`. Use `.choice` tiles for radio/checkbox groups. Keep forms short.
9. Every page ends with a CTA back into one of the three journeys
   (मेरा संकल्प / ग्राम सभा / सहायता केंद्र).
10. Placeholders: use `<span class="placeholder-note">…</span>` and `#` hrefs for any
    contact detail, phone number, social link, real statistic, PDF or video. Never
    invent a real phone number, address, NGO name, statistic or government scheme.

## Voice
सरल, सम्मानजनक हिंदी। छोटे वाक्य। "आप" संबोधन। कलंक-मुक्त भाषा —
"नशेड़ी" जैसे शब्द कभी नहीं; "नशे से प्रभावित व्यक्ति" लिखें।
English only where it is genuinely the everyday word (Good Parenting, वेबिनार,
मोबाइल, वीडियो, डैशबोर्ड, काउंसलिंग, हेल्पलाइन, अपलोड, डाउनलोड).
Content must come from the campaign copy the project lead supplies — expand it into
page structure, do not invent new claims.

## Verify before you finish
Run for each file you create:
    python3 -c "import html.parser,sys
class P(html.parser.HTMLParser):
  def __init__(s):
    super().__init__(); s.st=[]
  def handle_starttag(s,t,a):
    if t not in ('meta','link','img','br','hr','input','use','source','area','col','embed','param','track','wbr'): s.st.append(t)
  def handle_endtag(s,t):
    if s.st and s.st[-1]==t: s.st.pop()
    elif t in s.st: print('MISMATCH',t,s.st[-5:])
p=P(); p.feed(open(sys.argv[1],encoding='utf-8').read()); print('unclosed:',p.st)" FILE.html
Then `grep -o 'href="assets/img/icons.svg#[a-z-]*"' FILE.html | sort -u` and check every
id against `grep -o 'id="ic-[a-z-]*"' assets/img/icons.svg`.
