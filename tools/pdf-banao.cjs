/* दस्तावेज़ का HTML पन्ना A4 PDF में बदलता है।
   चलाने का तरीक़ा :
     python3 -m http.server 8762 &
     node tools/pdf-banao.cjs dastavez/saathi-jyani.html /कहीं/saathi-jyani.pdf
   मार्जिन दोनों काग़ज़ों के लिए एक जैसे रखे गए हैं ताकि छपाई मेल खाए। */
const { chromium } = require('playwright');
const [page, out] = process.argv.slice(2);
if (!page || !out) { console.error('चाहिए : <html का रास्ता> <pdf का रास्ता>'); process.exit(1); }
(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    args: ['--headless', '--no-sandbox'] });
  const pg = await (await b.newContext()).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('8762')[1]); });
  await pg.goto('http://localhost:8762/' + page.replace(/^\//, ''), { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(400);                 /* मात्राएँ जमने का समय */
  await pg.pdf({ path: out, format: 'A4', printBackground: true,
    margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#9aa3b0;padding:0 16mm;'
      + 'text-align:right;font-family:sans-serif">पृष्ठ <span class="pageNumber"></span>'
      + ' / <span class="totalPages"></span></div>' });
  console.log(errs.length ? 'ख़राबियाँ : ' + errs.slice(0, 5).join(' | ') : '✓ कोई ख़राबी नहीं');
  await b.close();
})();
