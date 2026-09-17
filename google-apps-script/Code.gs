/**
 * लोकसंकल्प — form receiver.
 *
 * Saves every form submission as a row in this spreadsheet (one tab per form)
 * and every uploaded photo as a file in a Drive folder, writing the file's link
 * into the row. Setup instructions: docs/FORMS.md in the website repository.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone
 * Then paste the /exec URL into js/config.js on the website.
 */

// ---- settings ------------------------------------------------------------

var FOLDER_NAME = 'लोकसंकल्प — फ़ॉर्म फ़ाइलें';
var MAX_FILES = 6;             // per submission
var MAX_FILE_BYTES = 8 * 1024 * 1024;
var MAX_TEXT = 4000;           // characters kept per field
// Largest participant count one sabha report may contribute. The endpoint is
// public, so a typo or a prank ("99999999") would otherwise wreck a headline
// figure the campaign is judged by. Anything above this is treated as a data
// error and contributes nothing; the sabha itself still counts.
var MAX_SABHA_SANKHYA = 50000;
var CODE_VERSION = 7;          // bump when this file changes; shown in every response

// Column order per form. Add a field here and it appears as a new column.
var FORMS = {
  sankalp:  { tab: 'संकल्प',           fields: ['naam', 'mobile', 'bhumika', 'jila', 'gaon', 'sweecha'] },
  sabha:    { tab: 'ग्राम सभा',        fields: ['gaon', 'block', 'jila', 'tithi', 'sankhya', 'samiti', 'report'] },
  kahani:   { tab: 'सफलता कहानियाँ',   fields: ['shirshak', 'naam', 'mobile', 'gaon', 'jila', 'shreni', 'kahani', 'sahmati'] },
  shikshak: { tab: 'शिक्षक',           fields: ['naam', 'mobile', 'vidyalaya', 'jila', 'pad', 'yogdan'] },
  yuva:     { tab: 'युवा क्लब',        fields: ['club', 'naam', 'mobile', 'gaon', 'jila', 'sadasya', 'ruchi'] },
  samman:   { tab: 'सम्मान नामांकन',   fields: ['shreni', 'namit', 'sthan', 'jila', 'karya', 'naam', 'mobile'] },
  sankalp21:{ tab: 'संकल्प 21',         fields: ['naam', 'mobile', 'jila', 'gaon', 'roop', 'sanstha',
                                                 'upvaas', 'sankalp', 'sahmati', 'photoSahmati'] },
  karuna21: { tab: 'करुणा 21',          fields: ['naam', 'jila', 'gaon', 'sandesh', 'sahmati'] }
};

// Human-readable column headings.
var LABELS = {
  naam: 'नाम', mobile: 'मोबाइल', bhumika: 'मैं हूँ', jila: 'जिला', gaon: 'गाँव',
  sweecha: 'स्वेच्छा से', block: 'ब्लॉक', tithi: 'तिथि', sankhya: 'प्रतिभागी', samiti: 'समिति गठित',
  report: 'रिपोर्ट', shirshak: 'शीर्षक', shreni: 'श्रेणी', kahani: 'कहानी',
  sahmati: 'सहमति', vidyalaya: 'विद्यालय', pad: 'पद', yogdan: 'योगदान',
  club: 'क्लब', sadasya: 'सदस्य संख्या', ruchi: 'रुचि', namit: 'नामांकित',
  sthan: 'गाँव / विद्यालय', karya: 'कार्य विवरण',
  roop: 'सहभागी के रूप में', sanstha: 'संस्था / विद्यालय', upvaas: 'उपवास',
  sankalp: 'लोकसंकल्प', photoSahmati: 'फोटो सहमति', sandesh: 'संदेश'
};

// ---- entry point ---------------------------------------------------------

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply(false, 'खाली अनुरोध');
    var data = JSON.parse(e.postData.contents);

    // Honeypot: a real person never fills a hidden field.
    if (data.website) return reply(true, 'धन्यवाद');

    var spec = FORMS[data.form];
    if (!spec) return reply(false, 'अज्ञात फ़ॉर्म');

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);                    // keep concurrent writes from colliding
    try {
      var links = saveFiles(data.files, data.form);
      var sheet = getTab(spec);
      var row = [timestamp()];
      for (var i = 0; i < spec.fields.length; i++) {
        row.push(clean(data.values ? data.values[spec.fields[i]] : ''));
      }
      row.push(links.join('\n'));
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    // A new row changes the published figures, so the cached copy is now
    // wrong. Dropping it means the very next reader recomputes: someone who
    // has just registered sees their own entry counted, not a number up to a
    // minute old. This is what makes a live demonstration work.
    try { CacheService.getScriptCache().remove(statsCacheKey()); } catch (err2) {}
    return reply(true, 'सहेज लिया गया');
  } catch (err) {
    return reply(false, String(err));
  }
}

/**
 * GET ?stats=1  ->  the numbers shown on the home page and the dashboard.
 * Everything is derived from the rows in this spreadsheet, so a figure only
 * moves when a real submission arrives. Delete a row and the count drops.
 */
function doGet(e) {
  if (!e || !e.parameter || !e.parameter.stats) {
    return reply(true, 'लोकसंकल्प फ़ॉर्म सेवा चालू है');
  }
  var cache = CacheService.getScriptCache();
  var key = statsCacheKey();
  var hit = cache.get(key);
  if (hit) return json(hit);
  try {
    var out = JSON.stringify({ ok: true, version: CODE_VERSION, stats: computeStats() });
    cache.put(key, out, 60);         // a minute is plenty; keeps reads cheap
    return json(out);
  } catch (err) {
    // Return JSON rather than letting Apps Script serve an HTML error page,
    // which the site could not parse and could not report usefully.
    return reply(false, 'आँकड़े गिनने में समस्या: ' + err);
  }
}

function statsCacheKey() { return 'stats-v' + CODE_VERSION; }

/**
 * One village written by many hands is still one village. Case and stray
 * spaces are levelled; spelling and script are not. Someone typing the name
 * in English as well as Hindi therefore counts twice, which is accepted:
 * guessing that two spellings mean the same place would be worse than the
 * occasional duplicate.
 */
function normPlace(value) {
  return String(value === null || value === undefined ? '' : value)
           .replace(/\s+/g, ' ')
           .trim()
           .toLowerCase();
}

function computeStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sankalpRows  = rows(ss, FORMS.sankalp.tab);
  var sabhaRows    = rows(ss, FORMS.sabha.tab);
  var kahaniRows   = rows(ss, FORMS.kahani.tab);
  var shikshakRows = rows(ss, FORMS.shikshak.tab);
  var yuvaRows     = rows(ss, FORMS.yuva.tab);
  var sammanRows   = rows(ss, FORMS.samman.tab);
  var s21Rows      = rows(ss, FORMS.sankalp21.tab);
  var k21Rows      = rows(ss, FORMS.karuna21.tab);

  // "जुड़े हुए गाँव" counts each village once, however many forms mention it.
  // Ten people from one village make that village count once, not ten times,
  // and a village a सभा already reached adds nothing when its residents
  // register individually.
  var villages = {};
  [[sankalpRows, FORMS.sankalp], [sabhaRows, FORMS.sabha],
   [kahaniRows, FORMS.kahani], [yuvaRows, FORMS.yuva],
   [s21Rows, FORMS.sankalp21]].forEach(function (pair) {
    var idx = pair[1].fields.indexOf('gaon');
    if (idx < 0) return;
    pair[0].forEach(function (r) {
      var v = normPlace(r[idx + 1]);
      if (v) villages[v] = 1;
    });
  });

  // The same villages, counted over संकल्प 21 alone, for that page's own figure.
  var s21Villages = {};
  var g21 = FORMS.sankalp21.fields.indexOf('gaon');
  s21Rows.forEach(function (r) {
    var v = normPlace(r[g21 + 1]);
    if (v) s21Villages[v] = 1;
  });

  var schools = {};
  var vIdx = FORMS.shikshak.fields.indexOf('vidyalaya');
  shikshakRows.forEach(function (r) {
    var v = normPlace(r[vIdx + 1]);
    if (v) schools[v] = 1;
  });

  var samitiIdx = FORMS.sabha.fields.indexOf('samiti');
  var samitiyan = sabhaRows.filter(function (r) {
    return String(r[samitiIdx + 1] || '').trim() === 'हाँ';
  }).length;

  // People who took the संकल्प together at a सभा count towards the headline
  // figure alongside those who filled the form themselves: a village that
  // pledges as one gathering is the campaign's normal path, not the exception.
  var nIdx = FORMS.sabha.fields.indexOf('sankhya');
  var sabhaPratibhagi = 0;
  sabhaRows.forEach(function (r) {
    sabhaPratibhagi += count(r[nIdx + 1]);
  });

  var stats = {
    gaon:       Object.keys(villages).length,
    sabhaen:    sabhaRows.length,
    samitiyan:  samitiyan,
    // One consolidated number. The two halves are published too, so the
    // dashboard can always show where the figure came from.
    sankalp:         sankalpRows.length + sabhaPratibhagi + s21Rows.length,
    sankalpOnline:   sankalpRows.length,
    sabhaPratibhagi: sabhaPratibhagi,
    shikshak:   shikshakRows.length,
    vidyalaya:  Object.keys(schools).length,
    yuvaClub:   yuvaRows.length,
    kahaniyan:  kahaniRows.length,
    samman:     sammanRows.length,
    // संकल्प 21 is folded into the headline figure above, because one
    // campaign should publish one number. It is also reported on its own so
    // the संकल्प 21 page can show just its own participation.
    sankalp21:      s21Rows.length,
    sankalp21Gaon:  Object.keys(s21Villages).length,
    karuna21:       k21Rows.length,
    sahayata:   0        // no form feeds this; set it in the मैनुअल आँकड़े tab
  };

  // Per-district breakdown for the जिलेवार प्रगति table. Only districts that
  // actually have activity appear, so no master list of districts is needed.
  var byDistrict = {};
  var touch = function (d) {
    d = String(d || '').trim();
    if (!d) return null;
    if (!byDistrict[d]) byDistrict[d] = { gaon: {}, sabhaen: 0, samitiyan: 0, sankalp: 0 };
    return byDistrict[d];
  };
  var jSankalp = FORMS.sankalp.fields.indexOf('jila');
  var gSankalp = FORMS.sankalp.fields.indexOf('gaon');
  sankalpRows.forEach(function (r) {
    var d = touch(r[jSankalp + 1]); if (!d) return;
    d.sankalp++;
    var v = normPlace(r[gSankalp + 1]); if (v) d.gaon[v] = 1;
  });
  var jSabha = FORMS.sabha.fields.indexOf('jila');
  var gSabha = FORMS.sabha.fields.indexOf('gaon');
  sabhaRows.forEach(function (r) {
    var d = touch(r[jSabha + 1]); if (!d) return;
    d.sabhaen++;
    d.sankalp += count(r[nIdx + 1]);   // same basis as the headline figure
    if (String(r[samitiIdx + 1] || '').trim() === 'हाँ') d.samitiyan++;
    var v = normPlace(r[gSabha + 1]); if (v) d.gaon[v] = 1;
  });
  var j21 = FORMS.sankalp21.fields.indexOf('jila');
  s21Rows.forEach(function (r) {
    var d = touch(r[j21 + 1]); if (!d) return;
    d.sankalp++;
    var v = normPlace(r[g21 + 1]); if (v) d.gaon[v] = 1;
  });
  stats.byDistrict = Object.keys(byDistrict).map(function (d) {
    return { jila: d, gaon: Object.keys(byDistrict[d].gaon).length,
             sabhaen: byDistrict[d].sabhaen, samitiyan: byDistrict[d].samitiyan,
             sankalp: byDistrict[d].sankalp };
  }).sort(function (a, b) { return (b.sabhaen + b.sankalp) - (a.sabhaen + a.sankalp); });

  // Optional tab "मैनुअल आँकड़े": column A a key from above, column B a number.
  // Lets staff publish figures no form can produce.
  var manual = ss.getSheetByName('मैनुअल आँकड़े');
  if (manual && manual.getLastRow() > 1) {
    manual.getRange(2, 1, manual.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var k = String(r[0] || '').trim();
      if (k && r[1] !== '' && !isNaN(Number(r[1]))) stats[k] = Number(r[1]);
    });
  }
  return stats;
}

/**
 * A cell read as a count: a whole number at least 0 and no larger than one
 * sabha could plausibly hold. Blanks, text and implausible values give 0.
 */
function count(value) {
  var n = Number(String(value === null || value === undefined ? '' : value).trim());
  if (!isFinite(n) || n < 0) return 0;
  n = Math.floor(n);
  return n > MAX_SABHA_SANKHYA ? 0 : n;
}

/** Data rows of a tab, header excluded; [] when the tab does not exist yet. */
function rows(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
           .filter(function (r) { return String(r[0] || '').trim() !== ''; });
}

function json(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

// ---- helpers -------------------------------------------------------------

function getTab(spec) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(spec.tab);
  var head = expectedHeader(spec);
  if (!sheet) {
    sheet = ss.insertSheet(spec.tab);
    sheet.appendRow(head);
    sheet.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  alignHeader(sheet, head);
  return sheet;
}

function expectedHeader(spec) {
  var head = ['समय'];
  for (var i = 0; i < spec.fields.length; i++) {
    head.push(LABELS[spec.fields[i]] || spec.fields[i]);
  }
  head.push('फ़ाइलें');
  return head;
}

/**
 * A row is written by position, so adding a field to FORMS would push every
 * later column of an existing tab one place to the right and quietly mismatch
 * the rows already saved. This puts the missing columns back where they belong
 * before anything is written, so old rows keep their meaning.
 *
 * It only acts when the sheet's header is the wanted header with columns
 * missing. A header it does not recognise (renamed or reordered by hand) is
 * left exactly as it is: guessing there would be worse than doing nothing.
 */
function alignHeader(sheet, want) {
  var width = sheet.getLastColumn();
  if (!width) {
    sheet.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }
  var have = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (v) {
    return String(v).trim();
  });
  if (have.length === want.length && have.join('\u0000') === want.join('\u0000')) return;

  // Every existing heading must still appear in the wanted header, in order.
  var at = 0;
  for (var j = 0; j < have.length; j++) {
    while (at < want.length && want[at] !== have[j]) at++;
    if (at === want.length) return;          // not a pure addition: leave it alone
    at++;
  }

  for (var k = 0; k < want.length; k++) {
    if (String(sheet.getRange(1, k + 1).getValue()).trim() === want[k]) continue;
    if (k + 1 <= sheet.getLastColumn()) sheet.insertColumnBefore(k + 1);
    sheet.getRange(1, k + 1).setValue(want[k]).setFontWeight('bold');
  }
}

function saveFiles(files, formName) {
  var links = [];
  if (!files || !files.length) return links;
  var folder = subFolder(formName);
  var n = Math.min(files.length, MAX_FILES);
  for (var i = 0; i < n; i++) {
    var f = files[i];
    if (!f || !f.data) continue;
    var bytes = Utilities.base64Decode(f.data);
    if (bytes.length > MAX_FILE_BYTES) continue;
    var name = (f.name || ('file-' + (i + 1))).replace(/[\/\\:*?"<>|]/g, '_');
    var blob = Utilities.newBlob(bytes, f.type || 'image/jpeg',
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd-HHmmss') + '-' + name);
    links.push(folder.createFile(blob).getUrl());
  }
  return links;
}

/** Files live beside the spreadsheet, in one sub-folder per form. */
function subFolder(formName) {
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  var base = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var root = childFolder(base, FOLDER_NAME);
  return childFolder(root, formName);
}

function childFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Array]') v = v.join(', ');
  v = String(v);
  // A leading =, +, - or @ would be read as a formula when the sheet is opened.
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v.length > MAX_TEXT ? v.substring(0, MAX_TEXT) : v;
}

function timestamp() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
}

function reply(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, version: CODE_VERSION, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
