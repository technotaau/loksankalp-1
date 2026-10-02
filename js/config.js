/* लोकसंकल्प form endpoint.
 *
 * Google Apps Script Web App bound to the spreadsheet
 * "लोकसंकल्प फ़ॉर्म डेटा" in send@technotaau.com. It appends a row per
 * submission and saves uploaded photos to Drive. Setup and troubleshooting:
 * docs/FORMS.md
 *
 * If this is ever emptied, forms still confirm on screen and say plainly that
 * nothing was saved. Check a replacement URL with:
 *   tools/check-form-endpoint.sh <url>
 */
window.LOKSANKALP_FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw5DbR-p0ech2BN7RwQ3LDVu9iFLYuawX7Pa7ph5-MVJFz0NAgi-aT-6UsC6T1fFlCwbw/exec';

/* Google Analytics 4.
 *
 * यह आईडी गुप्त नहीं है, हर पृष्ठ के स्रोत में दिखती है। खाली कर देने पर
 * कुछ नहीं नापा जाता और वेबसाइट वैसे ही चलती रहती है। लादने का तरीका और
 * कौन-सी घटनाएँ भेजी जाती हैं, यह js/site.js में लिखा है; वहाँ "GA4" खोजिए।
 */
window.LOKSANKALP_GA4 = 'G-SHMJZP3C5F';
