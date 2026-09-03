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

function doGet() {
  return reply(true, 'लोकसंकल्प फ़ॉर्म सेवा चालू है');
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
    .createTextOutput(JSON.stringify({ ok: ok, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
