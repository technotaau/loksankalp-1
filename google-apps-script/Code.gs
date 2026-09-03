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
var CODE_VERSION = 3;          // bump when this file changes; shown in every response

// Column order per form. Add a field here and it appears as a new column.
var FORMS = {
  sankalp:  { tab: 'संकल्प',           fields: ['naam', 'mobile', 'bhumika', 'jila', 'gaon', 'sweecha'] },
  sabha:    { tab: 'ग्राम सभा',        fields: ['gaon', 'jila', 'tithi', 'sankhya', 'samiti', 'report'] },
  kahani:   { tab: 'सफलता कहानियाँ',   fields: ['shirshak', 'naam', 'mobile', 'gaon', 'jila', 'shreni', 'kahani', 'sahmati'] },
  shikshak: { tab: 'शिक्षक',           fields: ['naam', 'mobile', 'vidyalaya', 'jila', 'pad', 'yogdan'] },
  yuva:     { tab: 'युवा क्लब',        fields: ['club', 'naam', 'mobile', 'gaon', 'jila', 'sadasya', 'ruchi'] },
  samman:   { tab: 'सम्मान नामांकन',   fields: ['shreni', 'namit', 'sthan', 'jila', 'karya', 'naam', 'mobile'] }
};

// Human-readable column headings.
var LABELS = {
  naam: 'नाम', mobile: 'मोबाइल', bhumika: 'मैं हूँ', jila: 'जिला', gaon: 'गाँव',
  sweecha: 'स्वेच्छा से', tithi: 'तिथि', sankhya: 'प्रतिभागी', samiti: 'समिति गठित',
  report: 'रिपोर्ट', shirshak: 'शीर्षक', shreni: 'श्रेणी', kahani: 'कहानी',
  sahmati: 'सहमति', vidyalaya: 'विद्यालय', pad: 'पद', yogdan: 'योगदान',
  club: 'क्लब', sadasya: 'सदस्य संख्या', ruchi: 'रुचि', namit: 'नामांकित',
  sthan: 'गाँव / विद्यालय', karya: 'कार्य विवरण'
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
  var hit = cache.get('stats');
  if (hit) return json(hit);
  try {
    var out = JSON.stringify({ ok: true, version: CODE_VERSION, stats: computeStats() });
    cache.put('stats', out, 60);         // a minute is plenty; keeps reads cheap
    return json(out);
  } catch (err) {
    // Return JSON rather than letting Apps Script serve an HTML error page,
    // which the site could not parse and could not report usefully.
    return reply(false, 'आँकड़े गिनने में समस्या: ' + err);
  }
}

function computeStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sankalpRows  = rows(ss, FORMS.sankalp.tab);
  var sabhaRows    = rows(ss, FORMS.sabha.tab);
  var kahaniRows   = rows(ss, FORMS.kahani.tab);
  var shikshakRows = rows(ss, FORMS.shikshak.tab);
  var yuvaRows     = rows(ss, FORMS.yuva.tab);
  var sammanRows   = rows(ss, FORMS.samman.tab);

  // "जुड़े हुए गाँव" counts each village once, however many forms mention it.
  var villages = {};
  [[sankalpRows, FORMS.sankalp], [sabhaRows, FORMS.sabha],
   [kahaniRows, FORMS.kahani], [yuvaRows, FORMS.yuva]].forEach(function (pair) {
    var idx = pair[1].fields.indexOf('gaon');
    if (idx < 0) return;
    pair[0].forEach(function (r) {
      var v = String(r[idx + 1] || '').trim();
      if (v) villages[v.toLowerCase()] = 1;
    });
  });

  var schools = {};
  var vIdx = FORMS.shikshak.fields.indexOf('vidyalaya');
  shikshakRows.forEach(function (r) {
    var v = String(r[vIdx + 1] || '').trim();
    if (v) schools[v.toLowerCase()] = 1;
  });

  var samitiIdx = FORMS.sabha.fields.indexOf('samiti');
  var samitiyan = sabhaRows.filter(function (r) {
    return String(r[samitiIdx + 1] || '').trim() === 'हाँ';
  }).length;

  var stats = {
    gaon:       Object.keys(villages).length,
    sabhaen:    sabhaRows.length,
    samitiyan:  samitiyan,
    sankalp:    sankalpRows.length,
    shikshak:   shikshakRows.length,
    vidyalaya:  Object.keys(schools).length,
    yuvaClub:   yuvaRows.length,
    kahaniyan:  kahaniRows.length,
    samman:     sammanRows.length,
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
    var v = String(r[gSankalp + 1] || '').trim(); if (v) d.gaon[v.toLowerCase()] = 1;
  });
  var jSabha = FORMS.sabha.fields.indexOf('jila');
  var gSabha = FORMS.sabha.fields.indexOf('gaon');
  sabhaRows.forEach(function (r) {
    var d = touch(r[jSabha + 1]); if (!d) return;
    d.sabhaen++;
    if (String(r[samitiIdx + 1] || '').trim() === 'हाँ') d.samitiyan++;
    var v = String(r[gSabha + 1] || '').trim(); if (v) d.gaon[v.toLowerCase()] = 1;
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
  if (!sheet) {
    sheet = ss.insertSheet(spec.tab);
    var head = ['समय'];
    for (var i = 0; i < spec.fields.length; i++) {
      head.push(LABELS[spec.fields[i]] || spec.fields[i]);
    }
    head.push('फ़ाइलें');
    sheet.appendRow(head);
    sheet.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
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
