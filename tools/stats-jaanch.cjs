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
]);
tab(F.atithyaGram, [
  {regNo:'LS-TAG-0001', gaon:'कूजटी', jila:'बीकानेर', sankhya:150},
  {regNo:'LS-TAG-0002', gaon:'चूरू',  jila:'चूरू',   sankhya:'80'},
]);

const s = ctx.computeStats();
const चाहिए = { atithyaVyakti:1, atithyaParivar:3, atithyaParivarVayask:6,
                atithyaSabhaen:2, atithyaSabhaUpasthit:230, atithyaGaon:3, atithyaJile:3 };
let सब_ठीक = true;
for (const k in चाहिए) {
  const ok = s[k] === चाहिए[k];
  if (!ok) सब_ठीक = false;
  console.log((ok ? '✓' : '✗') + '  ' + k + ' = ' + s[k] + (ok ? '' : '   (चाहिए ' + चाहिए[k] + ')'));
}
// आतिथ्य मुखपृष्ठ की संख्याओं में न जुड़े, यह भी जाँचिए
console.log((s.gaon === 0 ? '✓' : '✗') + '  मुखपृष्ठ का gaon आतिथ्य से नहीं बढ़ा : ' + s.gaon);
console.log((s.sankalp === 0 ? '✓' : '✗') + '  मुखपृष्ठ का sankalp आतिथ्य से नहीं बढ़ा : ' + s.sankalp);

// दूसरी हालत : एक भी टैब नहीं बना (आज की असली स्थिति)
for (const k in TABS) delete TABS[k];
const z = ctx.computeStats();
const ज = ['atithyaVyakti','atithyaParivar','atithyaParivarVayask','atithyaSabhaen',
           'atithyaSabhaUpasthit','atithyaGaon','atithyaJile'];
const शून्य = ज.every(k => z[k] === 0);
console.log((शून्य ? '✓' : '✗') + '  कोई टैब न हो तो सब शून्य, कोई ख़राबी नहीं : ' +
            ज.map(k => k + '=' + z[k]).join(' '));
process.exit(!शून्य ? 1 : (सब_ठीक && s.gaon === 0 && s.sankalp === 0 ? 0 : 1));
