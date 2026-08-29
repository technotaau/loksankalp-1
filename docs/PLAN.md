# लोकसंकल्प — वेबसाइट निर्माण योजना (Build Plan)

**अभियान:** नशे की सामाजिक स्वीकृति के विरुद्ध जनआंदोलन
**ध्येय वाक्य:** नशे को नहीं, संस्कारों को सामाजिक स्वीकृति

## 1. Audience & constraints (design ke faisle inhi se)
| Audience | Implication |
|---|---|
| गाँव के नागरिक, किसान, महिलाएँ | बड़ा फ़ॉन्ट, सरल हिंदी, कम शब्द, चित्र-प्रधान |
| स्कूल के विद्यार्थी व शिक्षक | रंगीन, कहानी-आधारित, डाउनलोड करने योग्य सामग्री |
| पंचायत / प्रशासन / स्वयंसेवी | स्पष्ट संपर्क, जुड़ने का सरल फ़ॉर्म |

**तकनीकी निर्णय:** static HTML + CSS (कोई build step नहीं) — 2G/3G पर तेज़, GitHub Pages पर सीधे होस्ट,
कोई framework payload नहीं। Progressive enhancement से थोड़ा vanilla JS।

**प्रदर्शन लक्ष्य:** पहला पेज < 150 KB, LCP < 2.5s on 3G, Lighthouse a11y ≥ 95.

## 2. Team (subagents) & responsibilities
| # | Agent | Job | QC gate (मैं — project lead — जाँचूँगा) |
|---|---|---|---|
| A1 | Content/Hindi | हिंदी कॉपी लिखना, शब्दों का सरलीकरण, English phrases सिर्फ़ ज़रूरत पर | भाषा सरलता, वर्तनी, matra, तथ्य |
| A2 | Design system | tokens, typography scale, components (button, card, section) | contrast ≥ 4.5:1, tap ≥ 48px |
| A3 | Page build | HTML semantic markup + CSS per page | validity, heading order, no layout shift |
| A4 | Assets/Media | logo SVG, icons, illustrations, image compression | वज़न, alt-text, retina |
| A5 | A11y + Perf | keyboard nav, ARIA, Lighthouse, mobile 320px | score gates |
| A6 | Deploy | GitHub Pages workflow, meta/OG tags, sitemap | live URL काम कर रहा है |

## 3. Stages with QC checkpoints
1. **Content lock** → A1 draft → *QC1: भाषा व संदेश*
2. **Design system** → A2 → *QC2: रंग/टाइपोग्राफ़ी/स्पेसिंग*
3. **Home page (impact screen)** → A3+A4 → *QC3: पहली स्क्रीन का प्रभाव*
4. **Inner pages** → A3 → *QC4: navigation ≤ 2 clicks to anything*
5. **A11y + performance pass** → A5 → *QC5: Lighthouse*
6. **Deploy** → A6 → *QC6: live smoke test*

## 4. Navigation principle
अधिकतम 5 मुख्य लिंक, हर पेज एक क्लिक दूर, हर पेज पर बड़ा "जुड़ें" बटन।
मोबाइल पर नीचे चिपका हुआ action bar (गाँव में अधिकतर उपयोग मोबाइल से)।

## 5. Pending inputs
- [ ] सामग्री योजना (content planning) — उपयोगकर्ता से आ रही है
- [ ] मूल logo file (PNG/SVG) — repo में `assets/img/logo.png` चाहिए
