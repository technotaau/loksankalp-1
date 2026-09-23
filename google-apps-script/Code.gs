/**
 * लोकसंकल्प form receiver.
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

// यह Drive में पहले से बने असली फ़ोल्डर का नाम है। इसमें em dash है, पर
// इसे मत बदलिए : नाम बदलते ही script एक नया खाली फ़ोल्डर बना लेगा और
// पुरानी सारी तस्वीरें पुराने फ़ोल्डर में छूट जाएँगी। यह नाम कभी किसी
// वेबसाइट पृष्ठ पर नहीं दिखता।
var FOLDER_NAME = 'लोकसंकल्प — फ़ॉर्म फ़ाइलें';
var MAX_FILES = 6;             // per submission
var MAX_FILE_BYTES = 8 * 1024 * 1024;
var MAX_TEXT = 4000;           // characters kept per field
// Largest participant count one sabha report may contribute. The endpoint is
// public, so a typo or a prank ("99999999") would otherwise wreck a headline
// figure the campaign is judged by. Anything above this is treated as a data
// error and contributes nothing; the sabha itself still counts.
var MAX_SABHA_SANKHYA = 50000;
// Largest household one इंकलाब 28 entry may contribute. "व्यक्ति" is a headline
// figure and the endpoint is public, so one typo or prank ("9999") would wreck
// it. Above this the number is treated as a data error and adds nothing to
// व्यक्ति; the entry itself, and its village and district, still count.
//
// The number counts the whole household, the registrant included.
//
// Set at 150 rather than a tighter number because a संयुक्त परिवार in these
// villages really can run to several dozen, and the cost of the two mistakes
// is not the same: too high lets a prank inflate the figure, which a look at
// the sheet catches, while too low silently drops a real joint family down to
// one person, which nobody ever notices. The sheet always keeps what was
// typed, so an entry refused here can still be read and counted by hand.
// If this changes, change max= on the form field too, because the page reads that
// attribute for its running total, so those two never drift apart.
var MAX_UPVAAS_SADASYA = 150;
var CODE_VERSION = 18;          // bump when this file changes; shown in every response

// Column order per form. Add a field here and it appears as a new column.
var FORMS = {
  sankalp:  { tab: 'संकल्प',           fields: ['naam', 'mobile', 'bhumika', 'jila', 'gaon', 'sweecha'] },
  sabha:    { tab: 'ग्राम सभा',        fields: ['gaon', 'block', 'jila', 'vidyalaya', 'tithi', 'sankhya', 'samiti', 'report'] },
  kahani:   { tab: 'सफलता कहानियाँ',   fields: ['shirshak', 'naam', 'mobile', 'gaon', 'jila', 'shreni', 'kahani', 'sahmati'] },
  shikshak: { tab: 'शिक्षक',           fields: ['naam', 'mobile', 'vidyalaya', 'jila', 'pad', 'yogdan'] },
  yuva:     { tab: 'युवा क्लब',        fields: ['club', 'naam', 'mobile', 'gaon', 'jila', 'sadasya', 'ruchi'] },
  samman:   { tab: 'सम्मान नामांकन',   fields: ['shreni', 'namit', 'sthan', 'jila', 'karya', 'naam', 'mobile'] },
  sankalp21:{ tab: 'संकल्प 21',         fields: ['naam', 'mobile', 'jila', 'gaon', 'roop', 'sanstha',
                                                 'upvaas', 'sankalp', 'sahmati', 'photoSahmati'] },
  karuna21: { tab: 'करुणा 21',          fields: ['naam', 'mobile', 'jila', 'gaon', 'sandesh', 'sahmati'] },
  // regNo is not a form field: the script fills it in under the lock so every
  // certificate carries a number that can be looked up in this sheet.
  inqlab28: { tab: 'इंकलाब 28',         regPrefix: 'IN28',
              fields: ['regNo', 'naam', 'mobile', 'upvaasSadasya', 'gaon', 'jila',
                       'rajya', 'desh', 'deshAnya', 'sahmati'] }
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
  sankalp: 'लोकसंकल्प', photoSahmati: 'फोटो सहमति', sandesh: 'संदेश',
  regNo: 'पंजीकरण क्रमांक', upvaasSadasya: 'उपवास सदस्य',
  rajya: 'राज्य', desh: 'देश', deshAnya: 'देश (लिखा हुआ)'
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

    // When a classroom submits together the page retries instead of showing an
    // error, so the same submission can arrive more than once. It carries an id
    // that is generated once and kept across those retries; the first write
    // records it and any repeat is answered as saved without writing again.
    var reqId = String(data.reqId || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
    var seen = CacheService.getScriptCache();
    var seenKey = 'req-' + reqId;
    // What is remembered is the registration number, not merely "seen". A
    // retry must hand back the SAME number: the certificate is printed from
    // it, and two numbers for one person would be two certificates for one
    // registration. Forms without a number remember a plain '1'.
    var already = reqId ? seen.get(seenKey) : null;
    if (already) return reply(true, 'पहले ही सहेज लिया गया', already === '1' ? '' : already);

    // Photographs go to Drive before the lock is taken. Uploading is the slow
    // part of a submission, and holding the queue open through it is what
    // would turn a classroom into a jam. The lock guards the append alone.
    var links = saveFiles(data.files, data.form);
    var regNo = '';

    var lock = LockService.getScriptLock();
    // Appending is quick, so a minute is room for a few hundred people.
    lock.waitLock(60000);
    try {
      // Checked again inside the lock: two retries racing each other would
      // both have passed the check above.
      var twice = reqId ? seen.get(seenKey) : null;
      if (twice) return reply(true, 'पहले ही सहेज लिया गया', twice === '1' ? '' : twice);
      var sheet = getTab(spec);
      var row = [timestamp()];
      for (var i = 0; i < spec.fields.length; i++) {
        row.push(clean(data.values ? data.values[spec.fields[i]] : ''));
      }
      // A declared regNo field is filled here, never by the sender: a number
      // the browser could choose would not be unique and could be forged.
      var at = spec.fields.indexOf('regNo');
      if (at >= 0) { regNo = nextRegNo(spec, sheet); row[1 + at] = regNo; }
      row.push(links.join('\n'));
      sheet.appendRow(row);
      if (reqId) seen.put(seenKey, regNo || '1', 21600);   // six hours
    } finally {
      lock.releaseLock();
    }
    // A new row changes the published figures, so the cached copy is now
    // wrong. Dropping it means the very next reader recomputes: someone who
    // has just registered sees their own entry counted, not a number up to a
    // minute old. This is what makes a live demonstration work.
    try { CacheService.getScriptCache().remove(statsCacheKey()); } catch (err2) {}
    return reply(true, 'सहेज लिया गया', regNo);
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
 * Where a field's column actually is, read from the sheet's own heading row.
 *
 * A sheet only gains a newly added column when the NEXT submission is written,
 * because that is when alignHeader runs. Until then the spec has the new field
 * and the sheet does not, and a position taken from the spec lands one column
 * short. That is exactly how विद्यालय came to count the तिथि column's dates as
 * school names the moment the field was added. Reading by heading cannot drift.
 *
 * Returns an absolute index into a data row, or -1 when the sheet or the
 * column is not there yet, which callers treat as "nothing to count".
 */
function colOf(ss, spec, field) {
  var sh = ss.getSheetByName(spec.tab);
  if (!sh || sh.getLastColumn() < 1) return -1;
  var want = LABELS[field] || field;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  for (var i = 0; i < head.length; i++) {
    if (String(head[i]).trim() === want) return i;
  }
  return -1;
}

/**
 * One village written by many hands is still one village. Case and stray
 * spaces are levelled; spelling and script are not. Someone typing the name
 * in English as well as Hindi therefore counts twice, which is accepted:
 * guessing that two spellings mean the same place would be worse than the
 * occasional duplicate.
 */
/* The विद्यालय field on the सभा report is required, so someone whose सभा had
   no school attached still has to write something. These are the answers they
   write. Counting them would invent schools called "नहीं" and "लागू नहीं". */
var NOT_A_PLACE = {
  'लागू नहीं': 1, 'लागूनहीं': 1, 'लागु नहीं': 1, 'नहीं': 1, 'नही': 1, 'ना': 1, 'न': 1,
  'कोई नहीं': 1, 'कोई नही': 1, 'कुछ नहीं': 1, 'शून्य': 1, 'निरंक': 1,
  'na': 1, 'n/a': 1, 'nil': 1, 'none': 1, 'no': 1, 'not applicable': 1, 'nai': 1,
  '-': 1, '--': 1, '---': 1, '.': 1, '0': 1, 'x': 1, '*': 1
};

/* A place name worth counting: present, more than one character, and not one
   of the refusals above. */
function isPlace(normalised) {
  return !!normalised && normalised.length > 1 && !NOT_A_PLACE[normalised];
}

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
  var i28Rows      = rows(ss, FORMS.inqlab28.tab);

  // "जुड़े हुए गाँव" counts each village once, however many forms mention it.
  // Ten people from one village make that village count once, not ten times,
  // and a village a सभा already reached adds nothing when its residents
  // register individually.
  var villages = {};
  [[sankalpRows, FORMS.sankalp], [sabhaRows, FORMS.sabha],
   [kahaniRows, FORMS.kahani], [yuvaRows, FORMS.yuva],
   [s21Rows, FORMS.sankalp21]].forEach(function (pair) {
    var idx = colOf(ss, pair[1], 'gaon');
    if (idx < 0) return;
    pair[0].forEach(function (r) {
      var v = normPlace(r[idx]);
      if (isPlace(v)) villages[v] = 1;
    });
  });

  // The same over करुणा 21 alone: the figures printed beneath its own form
  // should be about करुणा 21 and nothing else.
  var k21Villages = {};
  var gK21 = colOf(ss, FORMS.karuna21, 'gaon');
  if (gK21 >= 0) k21Rows.forEach(function (r) {
    var v = normPlace(r[gK21]);
    if (isPlace(v)) k21Villages[v] = 1;
  });

  /* इंकलाब 28 counts four things, and two of them are counted differently
     from anything else on this sheet.

     A person registers on behalf of a household: the form asks how many
     members of the family, INCLUDING them, will keep the fast. So one entry
     is one परिवार, and it brings exactly that number of व्यक्ति. A blank,
     zero or unreadable answer still brings one person; it never brings zero,
     because somebody did register.

     The question used to ask for the number BESIDES the registrant and this
     added one. The team changed the wording on 23 September, so the +1 is
     gone. Rows written under the old wording are one short of what their
     senders meant; they are few, and correcting them in the sheet is the
     honest fix rather than carrying two rules here forever. */
  var i28Villages = {}, i28Districts = {}, i28States = {}, i28Countries = {}, i28Vyakti = 0;
  /* जिलेवार, केवल इंकलाब 28 के अपने पृष्ठ के लिए। यह डैशबोर्ड वाली
     byDistrict तालिका से अलग रखा गया है : वह तालिका "जहाँ सभा और संकल्प
     हुए" के अर्थ में प्रचारित है, और उसमें एक घरेलू उपवास जोड़ देने से उस
     संख्या का अर्थ चुपचाप बदल जाता। bahar में राजस्थान से बाहर के राज्य
     और देश आते हैं, ताकि बाहर से जुड़ने वाले को भी अपना नाम दिखे। */
  var i28ByJila = {}, i28Bahar = {};
  var bucket = function (box, naam, kya) {
    if (!box[naam]) box[naam] = { parivar: 0, vyakti: 0, kya: kya || '' };
    return box[naam];
  };
  var gI28 = colOf(ss, FORMS.inqlab28, 'gaon');
  var jI28 = colOf(ss, FORMS.inqlab28, 'jila');
  var rI28 = colOf(ss, FORMS.inqlab28, 'rajya');
  var dI28 = colOf(ss, FORMS.inqlab28, 'desh');
  var daI28 = colOf(ss, FORMS.inqlab28, 'deshAnya');
  var sI28 = colOf(ss, FORMS.inqlab28, 'upvaasSadasya');
  i28Rows.forEach(function (r) {
    if (gI28 >= 0) { var v = normPlace(r[gI28]); if (isPlace(v)) i28Villages[v] = 1; }

    /* Where this entry is from, decided by which of the three columns is
       filled rather than by matching the words in जिला. The जिला column holds
       a marker for anyone outside Rajasthan ("भारत के अन्य राज्य से"), and
       counting that as a district would put a phrase among the district
       names. Reading the columns instead of the marker means the wording can
       be reworded any day without the counts quietly breaking. */
    var kul = sI28 < 0 ? 0 : count(r[sI28]);
    // Blank, zero or a typo: fall back to the one person who did register.
    if (kul < 1 || kul > MAX_UPVAAS_SADASYA) kul = 1;
    i28Vyakti += kul;

    var raj = rI28 < 0 ? '' : normPlace(r[rI28]);
    var des = dI28 < 0 ? '' : normPlace(r[dI28]);
    var desA = daI28 < 0 ? '' : normPlace(r[daI28]);
    var b = null;
    if (isPlace(desA) || isPlace(des)) {
      // "अन्य देश" is the escape hatch, so the written name wins when present
      var ku = isPlace(desA) ? desA : des;
      if (ku !== 'अन्य देश') { i28Countries[ku] = 1; b = bucket(i28Bahar, ku, 'देश'); }
    } else if (isPlace(raj)) {
      i28States[raj] = 1;
      b = bucket(i28Bahar, raj, 'राज्य');
    } else if (jI28 >= 0) {
      /* ड्रॉपडाउन का आख़िरी विकल्प "अन्य" है, यानी "मेरा जिला सूची में नहीं
         है"। राजस्थान का कोई जिला इस नाम का नहीं, इसलिए उसे एक जिला गिनना
         "राजस्थान के जिले" वाली संख्या को एक बढ़ा देता था और पृष्ठ पर दिखने
         वाली सूची से मेल नहीं खाता था। अब वह पंक्ति किसी जिले में नहीं गिनी
         जाती; पृष्ठ उसे "जिनका जिला दर्ज नहीं हुआ" में जोड़ लेता है। */
      var d = normPlace(r[jI28]);
      if (isPlace(d) && d !== 'अन्य') { i28Districts[d] = 1; b = bucket(i28ByJila, d, 'जिला'); }
    }
    if (b) { b.parivar++; b.vyakti += kul; }
  });

  // The same villages, counted over संकल्प 21 alone, for that page's own figure.
  var s21Villages = {};
  var g21 = colOf(ss, FORMS.sankalp21, 'gaon');
  if (g21 >= 0) s21Rows.forEach(function (r) {
    var v = normPlace(r[g21]);
    if (isPlace(v)) s21Villages[v] = 1;
  });

  // Schools are collected from the शिक्षक form and from सभा reports, into one
  // set. A school a teacher registered and a सभा later named counts once.
  var schools = {};
  [[shikshakRows, FORMS.shikshak], [sabhaRows, FORMS.sabha]].forEach(function (pair) {
    var idx = colOf(ss, pair[1], 'vidyalaya');
    if (idx < 0) return;
    pair[0].forEach(function (r) {
      var v = normPlace(r[idx]);
      if (isPlace(v)) schools[v] = 1;
    });
  });

  var samitiIdx = colOf(ss, FORMS.sabha, 'samiti');
  var samitiyan = samitiIdx < 0 ? 0 : sabhaRows.filter(function (r) {
    return String(r[samitiIdx] || '').trim() === 'हाँ';
  }).length;

  // People who took the संकल्प together at a सभा count towards the headline
  // figure alongside those who filled the form themselves: a village that
  // pledges as one gathering is the campaign's normal path, not the exception.
  var nIdx = colOf(ss, FORMS.sabha, 'sankhya');
  var sabhaPratibhagi = 0;
  if (nIdx >= 0) sabhaRows.forEach(function (r) {
    sabhaPratibhagi += count(r[nIdx]);
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
    karuna21Gaon:   Object.keys(k21Villages).length,
    // इंकलाब 28. Deliberately outside the headline संकल्प figure for now:
    // folding a household pledge into a number published as individual
    // संकल्प would change what that number means without saying so.
    inqlabVyakti:   i28Vyakti,
    inqlabParivar:  i28Rows.length,
    inqlabGaon:     Object.keys(i28Villages).length,
    inqlabJile:     Object.keys(i28Districts).length,
    inqlabRajya:    Object.keys(i28States).length,
    inqlabDesh:     Object.keys(i28Countries).length,
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
  var jSankalp = colOf(ss, FORMS.sankalp, 'jila');
  var gSankalp = colOf(ss, FORMS.sankalp, 'gaon');
  if (jSankalp >= 0) sankalpRows.forEach(function (r) {
    var d = touch(r[jSankalp]); if (!d) return;
    d.sankalp++;
    var v = gSankalp < 0 ? '' : normPlace(r[gSankalp]); if (isPlace(v)) d.gaon[v] = 1;
  });
  var jSabha = colOf(ss, FORMS.sabha, 'jila');
  var gSabha = colOf(ss, FORMS.sabha, 'gaon');
  if (jSabha >= 0) sabhaRows.forEach(function (r) {
    var d = touch(r[jSabha]); if (!d) return;
    d.sabhaen++;
    if (nIdx >= 0) d.sankalp += count(r[nIdx]);   // same basis as the headline figure
    if (samitiIdx >= 0 && String(r[samitiIdx] || '').trim() === 'हाँ') d.samitiyan++;
    var v = gSabha < 0 ? '' : normPlace(r[gSabha]); if (isPlace(v)) d.gaon[v] = 1;
  });
  var j21 = colOf(ss, FORMS.sankalp21, 'jila');
  if (j21 >= 0) s21Rows.forEach(function (r) {
    var d = touch(r[j21]); if (!d) return;
    d.sankalp++;
    var v = g21 < 0 ? '' : normPlace(r[g21]); if (isPlace(v)) d.gaon[v] = 1;
  });
  /* इंकलाब 28 की जिलेवार सूची। सबसे बड़ा जिला पहले, ताकि पृष्ठ पर पहली
     नज़र में ही पता चले कि कहाँ सबसे ज़्यादा लोग जुड़े हैं। */
  var listOf = function (box) {
    return Object.keys(box).map(function (n) {
      return { naam: n, parivar: box[n].parivar, vyakti: box[n].vyakti, kya: box[n].kya };
    }).sort(function (a, b) { return b.vyakti - a.vyakti || b.parivar - a.parivar; });
  };
  stats.inqlabByJila = listOf(i28ByJila);
  stats.inqlabBahar  = listOf(i28Bahar);

  stats.byDistrict = Object.keys(byDistrict).map(function (d) {
    return { jila: d, gaon: Object.keys(byDistrict[d].gaon).length,
             sabhaen: byDistrict[d].sabhaen, samitiyan: byDistrict[d].samitiyan,
             sankalp: byDistrict[d].sankalp };
  }).sort(function (a, b) { return (b.sabhaen + b.sankalp) - (a.sabhaen + a.sankalp); });

  /* Optional tab "मैनुअल आँकड़े": column A a key from above, column B a number.
     Two forms:
       vidyalaya    460    replaces the counted figure and freezes it there
       vidyalaya+   452    ADDS to the counted figure
     The second is what work done before the forms existed should use: the
     figure starts from that base and still climbs with every new report, which
     a plain replacement does not. */
  var manual = ss.getSheetByName('मैनुअल आँकड़े');
  if (manual && manual.getLastRow() > 1) {
    manual.getRange(2, 1, manual.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var k = String(r[0] || '').trim();
      if (!k || r[1] === '' || isNaN(Number(r[1]))) return;
      var n = Number(r[1]);
      if (k.charAt(k.length - 1) === '+') {
        var base = k.slice(0, -1).trim();
        if (base && typeof stats[base] === 'number') stats[base] += n;
      } else {
        stats[k] = n;
      }
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

function reply(ok, message, regNo) {
  var out = { ok: ok, version: CODE_VERSION, message: message };
  if (regNo) out.regNo = regNo;
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * The next registration number for a form, e.g. IN28-0001.
 *
 * Called only from inside the script lock, so the read-increment-write below
 * cannot interleave with another submission. The counter lives in script
 * properties rather than being derived from the row count, because deleting a
 * spam row must never hand the next person a number somebody already holds a
 * certificate for. On the very first call it starts above whatever rows the
 * sheet already has, so an existing tab does not restart at 1.
 */
function nextRegNo(spec, sheet) {
  var props = PropertiesService.getScriptProperties();
  var key = 'regno-' + spec.tab;
  var seenSoFar = props.getProperty(key);
  var n;
  if (seenSoFar === null) {
    var dataRows = Math.max(0, sheet.getLastRow() - 1);   // minus the heading
    n = dataRows + 1;
  } else {
    n = parseInt(seenSoFar, 10) + 1;
  }
  props.setProperty(key, String(n));
  // Padded to four digits for looks, but never truncated to four: slicing the
  // last four characters would turn 12345 into 2345 and hand out a number
  // somebody already holds a certificate for.
  var num = String(n);
  while (num.length < 4) num = '0' + num;
  return (spec.regPrefix || 'LS') + '-' + num;
}
