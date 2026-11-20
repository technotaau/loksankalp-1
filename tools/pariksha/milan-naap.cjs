/* संकल्प साथी : मिलान की कसौटी।
 *
 * असली ऐप को ब्राउज़र में चलाकर tools/pariksha/sawal.txt के साठ सवाल
 * पूछता है और लिखता है कि हर सवाल कहाँ पहुँचा। हर बड़े बदलाव से पहले और
 * बाद में यही चलाया जाता है, ताकि पता रहे कि गिनती घटी तो नहीं।
 *
 * 12 नवंबर 2026 से साथी पर लिखने का खाना नहीं है, सिर्फ़ बोलकर पूछा
 * जाता है। इसलिए यह औज़ार फ़ोन की आवाज़-पहचान की जगह अपनी नक़ली सेवा
 * लगाता है और उसमें कसौटी का सवाल डाल देता है। आगे का सारा रास्ता वही
 * है जो असली आदमी के बोलने पर चलता है, सुनने की भूल सुधारने वाली परत
 * भी उसी में आती है।
 *
 * चलाइए :
 *   python3 -m http.server 8765 &
 *   OUT=/कहीं/naap.json node tools/pariksha/milan-naap.cjs
 *
 * ध्यान : sawal.txt कसौटी है। उसके वाक्य roop.json में मत डालिए, वरना
 * कसौटी को ही पढ़ाकर पास कराना होगा और नाप का कोई मतलब नहीं रहेगा।
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const PORT = process.env.PORT || 8765;
  const file = path.join(__dirname, 'sawal.txt');
  const sawal = fs.readFileSync(file, 'utf8').trim().split('\n')
    .map(l => { const [q, t] = l.split('|'); return { q: (q||'').trim(), vishay: (t||'').trim() }; })
    .filter(x => x.q);

  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    args: ['--headless', '--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 420, height: 950 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**://script.google.com/**', r => r.abort());

  // नक़ली आवाज़-पहचान : बोला हुआ वाक्य सीधे वहीं डाल देती है
  await pg.addInitScript(() => {
    window.__bola = '';
    window.SpeechRecognition = function () {
      this.start = () => {
        if (this.onstart) this.onstart();
        setTimeout(() => {
          if (this.onresult) this.onresult({ results: [[{ transcript: window.__bola }]] });
          if (this.onend) this.onend();
        }, 15);
      };
      this.stop = () => { if (this.onend) this.onend(); };
    };
  });

  await pg.goto('http://localhost:' + PORT + '/saathi/', { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(n => /18 से ऊपर/.test(n.textContent || ''));
    if (btn) btn.click();
  });
  await pg.waitForTimeout(500);

  const out = [];
  for (const s of sawal) {
    await pg.evaluate(t => {
      window.__bola = t;
      ['s-home', 's-list', 's-confirm', 's-out'].forEach(id => {
        const n = document.getElementById(id); if (n) n.hidden = (id !== 's-home');
      });
    }, s.q);
    await pg.click('#b-mic');
    await pg.waitForTimeout(220);
    const r = await pg.evaluate(() => {
      const vis = id => { const n = document.getElementById(id); return n && !n.hidden; };
      if (vis('s-confirm')) {
        const t = document.getElementById('heard').textContent || '';
        // पुस्तिका वाला मेल और सूची वाला मेल अलग गिने जाते हैं। दोनों को
        // एक साथ "पहुँच गया" गिनना नाप को बढ़ा-चढ़ाकर दिखाता है :
        // पुस्तिका का मेल अक्सर बेतुका होता है और फिर भी पुष्टि तक पहुँचता है।
        return { parda: /पुस्तिका/.test(t) ? 'पुस्तिका' : 'पुष्टि', text: t };
      }
      if (vis('s-out')) {
        const o = document.getElementById('out');
        const h = o.querySelector('h2,h3');
        return { parda: 'जवाब', text: (h ? h.textContent : '').trim(),
                 samjha: !/समझ नहीं/.test(o.textContent) };
      }
      return { parda: 'कुछ नहीं', text: '' };
    });
    out.push({ ...s, ...r });
  }

  const n = p => out.filter(r => r.parda === p).length;
  const suchi = n('पुष्टि') + out.filter(r => r.parda === 'जवाब' && r.samjha).length;
  const kosh = n('पुस्तिका');
  console.log('कुल ' + out.length
    + ' | सूची से मेल ' + suchi
    + ' | पुस्तिका से ' + kosh
    + ' | इनकार ' + (out.length - suchi - kosh));
  console.log('(पुस्तिका वाले मेल हाथ से देखिए। वे अक्सर बेतुके होते हैं,'
    + ' इसलिए उन्हें सफलता में नहीं गिना जाता।)');
  if (errs.length) console.log('JS ख़राबी : ' + errs.slice(0, 3).join(' | '));
  if (process.env.OUT) {
    fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
    console.log('पूरा ब्योरा : ' + process.env.OUT);
  }
  await b.close();
})();
