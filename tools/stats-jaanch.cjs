/* computeStats() को नक़ली शीट पर चलाकर देखता है कि तंबाकू मुक्त आतिथ्य की
   गिनती सही आती है। असली Apps Script यहाँ नहीं चल सकता, इसलिए SpreadsheetApp
   का उतना ढाँचा बना लिया है जितना computeStats() छूता है।

   Code.gs बदलने के बाद, deploy करने से पहले चलाइए :
       node tools/stats-jaanch.cjs
   ठीक हो तो निकास कोड 0 आता है। */
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'google-apps-script', 'Code.gs'), 'utf8');

const TABS = {};   // नाम -> पंक्तियों की सारणी (पहली पंक्ति शीर्षक)
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ({
    getSheetByName(n) {
      const d = TABS[n]; if (!d) return null;
      return {
        getLastRow: () => d.length,
        getLastColumn: () => Math.max(...d.map(r => r.length)),
        getRange: (r, c, nr, nc) => ({ getValues: () =>
          d.slice(r - 1, r - 1 + nr).map(row => {
            const out = []; for (let i = 0; i < nc; i++) out.push(row[c - 1 + i] === undefined ? '' : row[c - 1 + i]);
            return out; }) })
      };
    } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
  Logger: { log: () => {} }, console
};
vm.createContext(ctx);
vm.runInContext(src, ctx);

const L = ctx.LABELS, F = ctx.FORMS;
const head = spec => spec.fields.map(f => L[f] || f);
function tab(spec, rowsObj) {
  TABS[spec.tab] = [head(spec)].concat(rowsObj.map(o => spec.fields.map(f => o[f] === undefined ? '' : o[f])));
}

// नक़ली आँकड़े
tab(F.atithya, [ {regNo:'LS-TA-0001', naam:'क', gaon:'कूजटी', jila:'बीकानेर'} ]);
tab(F.atithyaParivar, [
  {regNo:'LS-TAP-0001', naam:'ख', gaon:'कूजटी',  jila:'बीकानेर', vayaskSadasya:4},
  {regNo:'LS-TAP-0002', naam:'ग', gaon:'Churu',  jila:'बीकानेर', vayaskSadasya:''},   // ख़ाली -> 1; Churu -> चूरू
  {regNo:'LS-TAP-0003', naam:'घ', gaon:'नोखा',   jila:'जोधपुर',  vayaskSadasya:'दो'}, // बेतुका -> 1
  // राजस्थान से बाहर : राज्यों में गिना जाए, जिलों में नहीं
  {regNo:'LS-TAP-0004', naam:'ङ', gaon:'मंडी',   rajya:'पंजाब',  vayaskSadasya:2},
]);
tab(F.atithyaGram, [
  // पूरे गाँव की सभा -> ग्राम संकल्प में गिनी जाएगी
  {regNo:'LS-TAG-0001', gaon:'कूजटी', jila:'बीकानेर', sankhya:150,
   dayra:'पूरे गाँव या वार्ड की सार्वजनिक सभा'},
  // उसी गाँव की दूसरी सभा -> गाँव दोबारा नहीं गिना जाएगा
  {regNo:'LS-TAG-0003', gaon:'कूजटी', jila:'बीकानेर', sankhya:50,
   dayra:'पूरे गाँव या वार्ड की सार्वजनिक सभा'},
  // केवल कुछ परिवार -> ग्राम संकल्प में नहीं, पर सभाओं में गिनी जाएगी
  {regNo:'LS-TAG-0002', gaon:'चूरू',  jila:'चूरू',   sankhya:'80',
   dayra:'केवल भागीदार परिवारों का संकल्प'},
]);

// किसान संकल्प 23
tab(F.kisan23, [
  {regNo:'KS23-0001', naam:'च', mobile:'9', gaon:'धीरेरां', jila:'बीकानेर', upvaasSadasya:5},
  {regNo:'KS23-0002', naam:'छ', mobile:'9', gaon:'Dhirera', jila:'बीकानेर', upvaasSadasya:''},  // ख़ाली -> 1
  {regNo:'KS23-0003', naam:'ज', mobile:'9', gaon:'मंडी',   rajya:'पंजाब',  upvaasSadasya:'तीन'}, // बेतुका -> 1
]);
tab(F.kisan23Aayojan, [
  {regNo:'KS23A-0001', aayojanNaam:'धीरेरां ग्राम आयोजन', prakar:'गाँव', gaon:'धीरेरां',
   jila:'बीकानेर', upvaasAnumanit:120, sahyogAnumanit:'80', naam:'झ', mobile:'9'},
  {regNo:'KS23A-0002', aayojanNaam:'विद्यालय आयोजन', prakar:'शिक्षण संस्था', gaon:'नोखा',
   jila:'बीकानेर', upvaasAnumanit:'', sahyogAnumanit:30, naam:'ञ', mobile:'9'},
]);

const s = ctx.computeStats();
const चाहिए = { atithyaVyakti:1, atithyaParivar:4, atithyaParivarVayask:8,
                atithyaSabhaen:3, atithyaSabhaUpasthit:280,
                atithyaGramSankalp:1,      // कूजटी एक बार, चूरू नहीं (दायरा छोटा)
                atithyaGaon:4,             // कूजटी, चूरू, नोखा, मंडी
                atithyaJile:3,             // बीकानेर, जोधपुर, चूरू
                atithyaRajya:2,            // पंजाब + राजस्थान (क्योंकि जिले हैं)
                atithyaKulVyakti:289,      // 1 + 8 + 280
                kisan23Vyakti:3, kisan23UpvaasSadasya:7,   // 5 + 1 + 1
                kisan23Aayojan:2,
                kisan23UpvaasAnumanit:120,   // ख़ाली वाला शून्य ही रहता है
                kisan23SahyogAnumanit:110,   // 80 + 30
                kisan23Gaon:4,             // धीरेरां, dhirera, मंडी, नोखा
                kisan23Jile:1,             // बीकानेर
                kisan23Rajya:1,            // पंजाब
                kisan23Desh:0 };
let सब_ठीक = true;
for (const k in चाहिए) {
  const ok = s[k] === चाहिए[k];
  if (!ok) सब_ठीक = false;
  console.log((ok ? '✓' : '✗') + '  ' + k + ' = ' + s[k] + (ok ? '' : '   (चाहिए ' + चाहिए[k] + ')'));
}
// आतिथ्य मुखपृष्ठ की संख्याओं में न जुड़े, यह भी जाँचिए
// आतिथ्य मुखपृष्ठ में नहीं जुड़ता; किसान संकल्प के गाँव जुड़ते हैं (4), संकल्प नहीं
console.log((s.gaon === 4 ? '✓' : '✗') + '  मुखपृष्ठ का gaon : ' + s.gaon + '  (आतिथ्य से नहीं, किसान संकल्प के चार गाँव से)');
console.log((s.sankalp === 0 ? '✓' : '✗') + '  मुखपृष्ठ का sankalp नहीं बढ़ा : ' + s.sankalp);
console.log((s.kulJile === 1 ? '✓' : '✗') + '  मुखपृष्ठ के kulJile : ' + s.kulJile);

// दूसरी हालत : एक भी टैब नहीं बना (आज की असली स्थिति)
for (const k in TABS) delete TABS[k];
const z = ctx.computeStats();
const ज = Object.keys(चाहिए);
const शून्य = ज.every(k => z[k] === 0);
console.log((शून्य ? '✓' : '✗') + '  कोई टैब न हो तो सब शून्य, कोई ख़राबी नहीं : ' +
            ज.map(k => k + '=' + z[k]).join(' '));
process.exit(!शून्य ? 1 : (सब_ठीक && s.gaon === 4 && s.sankalp === 0 && s.kulJile === 1 ? 0 : 1));
