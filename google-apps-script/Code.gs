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
// This was 150 until 28 September, on the argument that a संयुक्त परिवार can
// run to several dozen and that dropping a real family to one person is the
// worse of the two mistakes. The sheet then settled the argument: three-digit
// entries turned up, and no three-digit household exists. A wide limit was
// buying a rare case at the price of a figure the campaign is judged by, so
// the cap is now 9, the same single digit the form allows.
//
// Entries already saved above 9 keep their text in the sheet and count as the
// one person who did register, the same as a blank. That understates a genuine
// large family, and it is the honest direction to be wrong in on a public
// number: we count only what we can vouch for.
//
// If this changes, change max= on #i-sadasya too. Nothing reads the attribute
// at runtime; the two are simply the same rule stated on both sides, and the
// form must not let through what this refuses to count.
var MAX_UPVAAS_SADASYA = 9;
var CODE_VERSION = 26;          // bump when this file changes; shown in every response

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
                       'rajya', 'desh', 'deshAnya', 'sahmati'] },
  /* संकल्प दूत : स्वयंसेवक बनने का पंजीकरण, गांधी जयंती से। यह किसी
     एक दिन का आयोजन नहीं है, इसलिए न CAMPAIGNS में है और न FORM_SHUT में।
     क्रमांक पर regPrefix नहीं लिखा है, इसलिए nextRegNo() का अपना डिफ़ॉल्ट
     लगता है और संख्या LS-0001 बनती है, जैसा प्रमाण-पत्र पर छपना है। */
  sankalpDoot: { tab: 'संकल्प दूत',
              fields: ['regNo', 'naam', 'mobile', 'aayuVarg', 'bhumika', 'gaon', 'jila',
                       'rajya', 'desh', 'deshAnya', 'sahmati'] }
};

/* Campaigns whose form no longer takes entries, and the moment each shut.
   Written as UTC so the hour is the same wherever the server runs; these are
   the same moments as CAMPAIGNS[...].closes in js/site.js.

   The page stops showing the form at that hour on its own. This exists for
   what the page cannot reach: a phone holding the old page in its cache, or
   anything posting straight at this endpoint. On 29 September, after इंकलाब
   28 was over and every button and menu item advertising it had already
   stepped aside, 195 more families still came in overnight. They were sending
   a pledge to fast on a day that had passed, and the figure they moved had
   already been published. A shut form has to be shut on both sides.

   The rows already in the sheet are untouched and keep counting. What is
   refused is a new row, and the person is told why rather than being left to
   wonder whether it saved. */
var FORM_SHUT = {
  inqlab28: Date.UTC(2026, 8, 28, 18, 30)    // 29 सित॰ 00:00 IST
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
  rajya: 'राज्य', desh: 'देश', deshAnya: 'देश (लिखा हुआ)',
  aayuVarg: 'आयु वर्ग'
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

    // बीत चुके आयोजन का फ़ॉर्म। देखिए FORM_SHUT।
    var shutAt = FORM_SHUT[data.form];
    if (shutAt && Date.now() >= shutAt) {
      return reply(false, 'इस आयोजन का पंजीकरण बंद हो चुका है। पृष्ठ को ताज़ा कीजिए।');
    }

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

/* जगह का नाम एक ही रूप में लाना।

   जिला, राज्य और देश, तीनों फ़ॉर्म में ड्रॉपडाउन हैं, इसलिए वहाँ से हमेशा
   देवनागरी नाम ही आता है। पर Sheet में पंक्तियाँ हाथ से भी भरी जाती हैं,
   और तब कोई "churu" या "ajmer" लिख देता है। नतीजा यह कि पृष्ठ पर चूरू और
   churu दो अलग जिले बनकर बैठ जाते हैं, और जिलों की गिनती भी बढ़ी हुई
   दिखती है। 26 सितम्बर को ऐसी चार पंक्तियाँ मिलीं।

   नीचे की तालिका अंग्रेज़ी में लिखे रूपों को देवनागरी नाम पर ले आती है।
   मिलान करते समय छोटे-बड़े अक्षर और बीच की जगह नहीं देखी जाती, इसलिए
   "Sri Ganganagar", "sriganganagar" और "SRIGANGANAGAR", तीनों एक ही जगह
   पहुँचते हैं। जो नाम तालिका में नहीं है वह जैसा आया वैसा ही रहता है,
   इसलिए गाँवों के नाम इससे नहीं बिगड़ते। */
var PLACE_ALIAS = {
  // जिले
  'ajmer': 'अजमेर',
  'alwar': 'अलवर',
  'udaipur': 'उदयपुर',
  'karauli': 'करौली',
  'kotputlibehror': 'कोटपूतली-बहरोड़',
  'kotputlibahror': 'कोटपूतली-बहरोड़',
  'kotputli': 'कोटपूतली-बहरोड़',
  'kota': 'कोटा',
  'khairthaltijara': 'खैरथल-तिजारा',
  'khairthal': 'खैरथल-तिजारा',
  'chittorgarh': 'चित्तौड़गढ़',
  'chittaurgarh': 'चित्तौड़गढ़',
  'chittor': 'चित्तौड़गढ़',
  'churu': 'चूरू',
  'chooru': 'चूरू',
  'jaipur': 'जयपुर',
  'jalore': 'जालौर',
  'jalor': 'जालौर',
  'jaisalmer': 'जैसलमेर',
  'jodhpur': 'जोधपुर',
  'jhalawar': 'झालावाड़',
  'jhunjhunu': 'झुंझुनू',
  'jhunjhunun': 'झुंझुनू',
  'jhujhunu': 'झुंझुनू',
  'tonk': 'टोंक',
  'deeg': 'डीग',
  'dig': 'डीग',
  'didwanakuchaman': 'डीडवाना-कुचामन',
  'didwana': 'डीडवाना-कुचामन',
  'dungarpur': 'डूंगरपुर',
  'doongarpur': 'डूंगरपुर',
  'dausa': 'दौसा',
  'dholpur': 'धौलपुर',
  'dhaulpur': 'धौलपुर',
  'nagaur': 'नागौर',
  'nagor': 'नागौर',
  'pali': 'पाली',
  'pratapgarh': 'प्रतापगढ़',
  'phalodi': 'फलौदी',
  'falodi': 'फलौदी',
  'banswara': 'बांसवाड़ा',
  'barmer': 'बाड़मेर',
  'badmer': 'बाड़मेर',
  'baran': 'बारां',
  'balotra': 'बालोतरा',
  'bikaner': 'बीकानेर',
  'bundi': 'बूंदी',
  'boondi': 'बूंदी',
  'beawar': 'ब्यावर',
  'bharatpur': 'भरतपुर',
  'bhilwara': 'भीलवाड़ा',
  'rajsamand': 'राजसमंद',
  'sriganganagar': 'श्रीगंगानगर',
  'sriganganagar': 'श्रीगंगानगर',
  'ganganagar': 'श्रीगंगानगर',
  'shriganganagar': 'श्रीगंगानगर',
  'salumbar': 'सलूम्बर',
  'sawaimadhopur': 'सवाई माधोपुर',
  'sawaimadhopur': 'सवाई माधोपुर',
  'sirohi': 'सिरोही',
  'sikar': 'सीकर',
  'hanumangarh': 'हनुमानगढ़',
  'hanumagarh': 'हनुमानगढ़',
  // राज्य
  'andhrapradesh': 'आंध्र प्रदेश',
  'arunachalpradesh': 'अरुणाचल प्रदेश',
  'assam': 'असम',
  'bihar': 'बिहार',
  'chhattisgarh': 'छत्तीसगढ़',
  'goa': 'गोवा',
  'gujarat': 'गुजरात',
  'haryana': 'हरियाणा',
  'himachalpradesh': 'हिमाचल प्रदेश',
  'jharkhand': 'झारखंड',
  'karnataka': 'कर्नाटक',
  'kerala': 'केरल',
  'madhyapradesh': 'मध्य प्रदेश',
  'maharashtra': 'महाराष्ट्र',
  'manipur': 'मणिपुर',
  'meghalaya': 'मेघालय',
  'mizoram': 'मिज़ोरम',
  'nagaland': 'नागालैंड',
  'odisha': 'ओडिशा',
  'orissa': 'ओडिशा',
  'punjab': 'पंजाब',
  'sikkim': 'सिक्किम',
  'tamilnadu': 'तमिलनाडु',
  'tamilnadu': 'तमिलनाडु',
  'telangana': 'तेलंगाना',
  'tripura': 'त्रिपुरा',
  'uttarpradesh': 'उत्तर प्रदेश',
  'uttarakhand': 'उत्तराखंड',
  'westbengal': 'पश्चिम बंगाल',
  'andamanandnicobar': 'अंडमान और निकोबार',
  'andaman': 'अंडमान और निकोबार',
  'chandigarh': 'चंडीगढ़',
  'delhi': 'दिल्ली',
  'newdelhi': 'दिल्ली',
  'jammuandkashmir': 'जम्मू और कश्मीर',
  'jammukashmir': 'जम्मू और कश्मीर',
  'jk': 'जम्मू और कश्मीर',
  'ladakh': 'लद्दाख',
  'lakshadweep': 'लक्षद्वीप',
  'puducherry': 'पुडुचेरी',
  'pondicherry': 'पुडुचेरी',
  'rajasthan': 'राजस्थान',
  // देश
  'uae': 'संयुक्त अरब अमीरात',
  'uae': 'संयुक्त अरब अमीरात',
  'unitedarabemirates': 'संयुक्त अरब अमीरात',
  'dubai': 'संयुक्त अरब अमीरात',
  'sharjah': 'संयुक्त अरब अमीरात',
  'abudhabi': 'संयुक्त अरब अमीरात',
  'usa': 'अमेरिका',
  'usa': 'अमेरिका',
  'unitedstates': 'अमेरिका',
  'america': 'अमेरिका',
  'saudiarabia': 'सऊदी अरब',
  'saudi': 'सऊदी अरब',
  'malaysia': 'मलेशिया',
  'kuwait': 'कुवैत',
  'oman': 'ओमान',
  'qatar': 'क़तर',
  'uk': 'ब्रिटेन',
  'uk': 'ब्रिटेन',
  'unitedkingdom': 'ब्रिटेन',
  'britain': 'ब्रिटेन',
  'england': 'ब्रिटेन',
  'canada': 'कनाडा',
  'australia': 'ऑस्ट्रेलिया',
  'nepal': 'नेपाल',
  'singapore': 'सिंगापुर',
  'southafrica': 'दक्षिण अफ़्रीका',
  'srilanka': 'श्रीलंका',
  'srilanka': 'श्रीलंका',
  'bahrain': 'बहरीन',
  'newzealand': 'न्यूज़ीलैंड',
  'germany': 'जर्मनी',
  'italy': 'इटली',
  'mauritius': 'मॉरीशस',
  'fiji': 'फ़िजी',
  'thailand': 'थाईलैंड',
  'myanmar': 'म्यांमार',
  'burma': 'म्यांमार'
};

function normPlace(value) {
  var v = String(value === null || value === undefined ? '' : value)
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
  if (!v) return v;
  var key = v.replace(/[\s.\-_]/g, '');
  return PLACE_ALIAS[key] || v;
}

/* राजस्थान के इकतालीस जिले, tools/districts.txt से */
var RAJ_JILA = {
  'अजमेर': 1,
  'अलवर': 1,
  'उदयपुर': 1,
  'करौली': 1,
  'कोटपूतली-बहरोड़': 1,
  'कोटा': 1,
  'खैरथल-तिजारा': 1,
  'चित्तौड़गढ़': 1,
  'चूरू': 1,
  'जयपुर': 1,
  'जालौर': 1,
  'जैसलमेर': 1,
  'जोधपुर': 1,
  'झालावाड़': 1,
  'झुंझुनू': 1,
  'टोंक': 1,
  'डीग': 1,
  'डीडवाना-कुचामन': 1,
  'डूंगरपुर': 1,
  'दौसा': 1,
  'धौलपुर': 1,
  'नागौर': 1,
  'पाली': 1,
  'प्रतापगढ़': 1,
  'फलौदी': 1,
  'बांसवाड़ा': 1,
  'बाड़मेर': 1,
  'बारां': 1,
  'बालोतरा': 1,
  'बीकानेर': 1,
  'बूंदी': 1,
  'ब्यावर': 1,
  'भरतपुर': 1,
  'भीलवाड़ा': 1,
  'राजसमंद': 1,
  'श्रीगंगानगर': 1,
  'सलूम्बर': 1,
  'सवाई माधोपुर': 1,
  'सिरोही': 1,
  'सीकर': 1,
  'हनुमानगढ़': 1
};

/* भारत के राज्य और केंद्रशासित प्रदेश, फ़ॉर्म की सूची से। राजस्थान
   जानबूझकर नहीं है : वह "अन्य राज्य" नहीं है। */
var BHARAT_RAJYA = {
  'आंध्र प्रदेश': 1,
  'अरुणाचल प्रदेश': 1,
  'असम': 1,
  'बिहार': 1,
  'छत्तीसगढ़': 1,
  'गोवा': 1,
  'गुजरात': 1,
  'हरियाणा': 1,
  'हिमाचल प्रदेश': 1,
  'झारखंड': 1,
  'कर्नाटक': 1,
  'केरल': 1,
  'मध्य प्रदेश': 1,
  'महाराष्ट्र': 1,
  'मणिपुर': 1,
  'मेघालय': 1,
  'मिज़ोरम': 1,
  'नागालैंड': 1,
  'ओडिशा': 1,
  'पंजाब': 1,
  'सिक्किम': 1,
  'तमिलनाडु': 1,
  'तेलंगाना': 1,
  'त्रिपुरा': 1,
  'उत्तर प्रदेश': 1,
  'उत्तराखंड': 1,
  'पश्चिम बंगाल': 1,
  'अंडमान और निकोबार': 1,
  'चंडीगढ़': 1,
  'दादरा और नगर हवेली तथा दमन और दीव': 1,
  'दिल्ली': 1,
  'जम्मू और कश्मीर': 1,
  'लद्दाख': 1,
  'लक्षद्वीप': 1,
  'पुडुचेरी': 1
};

/* नाम असल में किस तरह की जगह है।

   27 सितम्बर को "राजस्थान" देशों की सूची में आ गया था। किसी ने फ़ॉर्म में
   "भारत से बाहर" चुनकर, फिर "अन्य देश" चुनकर, हाथ से "राजस्थान" लिख दिया।
   अब तक कोड यह मानकर चलता था कि जो देश वाले खाने में लिखा है वह देश ही है।

   इसलिए अब खाना यह तय नहीं करता कि जगह किस तरह की है, नाम तय करता है।
   जिलों की सूची में मिला तो जिला, राज्यों की सूची में मिला तो राज्य, और
   बाकी सब देश। "राजस्थान" और "भारत" किसी सूची में नहीं गिने जाते : उनसे यह
   पता ही नहीं चलता कि आदमी कहाँ का है, और अंदाज़ा लगाने से गिनती झूठी हो
   जाती। वे पंक्तियाँ "जिला दर्ज नहीं हुआ" में आती हैं, जो सच है। */
function placeKind(n) {
  if (!isPlace(n)) return '';
  if (RAJ_JILA[n]) return 'जिला';
  if (n === 'राजस्थान' || n === 'भारत' || n === 'अन्य देश') return '';
  if (BHARAT_RAJYA[n]) return 'राज्य';
  return 'देश';
}

/* जगह के खाने एक बार देख लिए जाते हैं, हर पंक्ति पर नहीं। colOf() हर बुलावे
   पर शीर्षक पंक्ति पढ़ता है, और दस फ़ॉर्मों की हज़ारों पंक्तियों पर वह महँगा
   पड़ता है। जिस फ़ॉर्म में राज्य या देश का खाना ही नहीं है वहाँ -1 आता है और
   kahanSe() सिर्फ़ जिला पढ़ता है। */
function jagahIdx(ss, spec) {
  return {
    jila:     colOf(ss, spec, 'jila'),
    rajya:    colOf(ss, spec, 'rajya'),
    desh:     colOf(ss, spec, 'desh'),
    deshAnya: colOf(ss, spec, 'deshAnya')
  };
}

/* एक पंक्ति कहाँ से आई है। नाम लौटता है और उसकी तरह, या कुछ नहीं।

   चार खाने इस क्रम में देखे जाते हैं : हाथ से लिखा देश, ड्रॉपडाउन का देश,
   राज्य, और आख़िर में जिला। जो पहले भरा मिले वही नाम लिया जाता है, और वह
   जगह किस तरह की है यह placeKind() तय करता है, खाना नहीं। 27 सितम्बर को
   किसी ने "अन्य देश" में "राजस्थान" लिख दिया था और वह देशों की सूची में जा
   बैठा; नाम से तय करने पर वह फिर नहीं हो सकता।

   जिले पर एक अतिरिक्त कड़ाई है : नाम राजस्थान के 41 जिलों में हो, तभी जिला
   गिना जाता है। जिला ड्रॉपडाउन है, पर Sheet में पंक्तियाँ हाथ से भी भरी
   जाती हैं, और वहाँ "अन्य" या गाँव का नाम भी पड़ा मिलता है। ऐसा नाम पहले
   चुपचाप देश बन जाता था। अब वह कहीं नहीं गिना जाता, जो सच है।

   यही एक विधि सब फ़ॉर्मों के लिए है। पहले इंकलाब 28 और संकल्प दूत की अपनी
   अलग नकलें थीं; एक में सुधार दूसरी में नहीं पहुँचता था। */
function kahanSe(r, idx) {
  var raj  = idx.rajya    < 0 ? '' : normPlace(r[idx.rajya]);
  var des  = idx.desh     < 0 ? '' : normPlace(r[idx.desh]);
  var desA = idx.deshAnya < 0 ? '' : normPlace(r[idx.deshAnya]);
  var naam = isPlace(desA) ? desA : (isPlace(des) ? des : raj);
  var kind = placeKind(naam);
  if (kind) return { naam: naam, kya: kind };
  // भरा तो है, पर उससे जगह का पता नहीं चलता ("राजस्थान", "भारत")
  if (isPlace(desA) || isPlace(des) || isPlace(raj)) return null;
  if (idx.jila < 0) return null;
  var d = normPlace(r[idx.jila]);
  return RAJ_JILA[d] ? { naam: d, kya: 'जिला' } : null;
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
  var sdRows       = rows(ss, FORMS.sankalpDoot.tab);

  /* "जुड़े हुए गाँव" हर गाँव को एक बार गिनता है, चाहे वह कितने ही फ़ॉर्मों में
     आए। एक ही गाँव के दस लोग उस गाँव को दस बार नहीं बना देते, और जिस गाँव में सभा
     हो चुकी है वहाँ का कोई व्यक्ति अलग से पंजीकरण करे तो गिनती नहीं बढ़ती।

     नाम normPlace() से होकर आता है, इसलिए "चूरू" और "churu" दो गाँव नहीं बनते।
     Sheet पर सीधे COUNTUNIQUE चलाने पर संख्या इससे कुछ ज़्यादा आएगी, कम नहीं।

     सभी छह फ़ॉर्म इसमें हैं (2 अक्तूबर से)। पहले करुणा 21, इंकलाब 28 और
     संकल्प दूत बाहर थे, इसलिए मुखपृष्ठ उन गाँवों को नहीं गिनता था जहाँ अभियान
     सचमुच पहुँच चुका था। अकेले इंकलाब 28 के गाँव बाक़ी सब मिलाकर से ज़्यादा थे। */
  var villages = {};
  [[sankalpRows, FORMS.sankalp], [sabhaRows, FORMS.sabha],
   [kahaniRows, FORMS.kahani], [yuvaRows, FORMS.yuva],
   [s21Rows, FORMS.sankalp21], [k21Rows, FORMS.karuna21],
   [i28Rows, FORMS.inqlab28], [sdRows, FORMS.sankalpDoot]].forEach(function (pair) {
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
  var iI28 = jagahIdx(ss, FORMS.inqlab28);
  var sI28 = colOf(ss, FORMS.inqlab28, 'upvaasSadasya');
  /* एक पंक्ति कितने व्यक्ति लाई। ख़ाली, शून्य या बेतुका जवाब होने पर भी एक,
     क्योंकि पंजीकरण तो किसी ने किया ही है। जिलेवार तालिका भी यही गिनती
     इस्तेमाल करती है, इसलिए यह अलग से रखा गया है। */
  var i28Kul = function (r) {
    var n = sI28 < 0 ? 0 : count(r[sI28]);
    return (n < 1 || n > MAX_UPVAAS_SADASYA) ? 1 : n;
  };
  i28Rows.forEach(function (r) {
    if (gI28 >= 0) { var v = normPlace(r[gI28]); if (isPlace(v)) i28Villages[v] = 1; }

    var kul = i28Kul(r);
    i28Vyakti += kul;

    /* जगह kahanSe() से आती है, जो सब फ़ॉर्मों के लिए एक ही है। जिस पंक्ति से
       जगह का पता नहीं चलता वह किसी सूची में नहीं जाती; पृष्ठ उसे "जिनका जिला
       दर्ज नहीं हुआ" में जोड़ लेता है, और वह सच है। bahar में राजस्थान से
       बाहर के राज्य और देश आते हैं, ताकि बाहर से जुड़ने वाले को भी अपना नाम
       दिखे। */
    var b = null, j = kahanSe(r, iI28);
    if (j && j.kya === 'देश')       { i28Countries[j.naam] = 1; b = bucket(i28Bahar, j.naam, 'देश'); }
    else if (j && j.kya === 'राज्य') { i28States[j.naam] = 1;    b = bucket(i28Bahar, j.naam, 'राज्य'); }
    else if (j)                      { i28Districts[j.naam] = 1; b = bucket(i28ByJila, j.naam, 'जिला'); }
    if (b) { b.parivar++; b.vyakti += kul; }
  });

  // The same villages, counted over संकल्प 21 alone, for that page's own figure.
  var s21Villages = {};
  var g21 = colOf(ss, FORMS.sankalp21, 'gaon');
  if (g21 >= 0) s21Rows.forEach(function (r) {
    var v = normPlace(r[g21]);
    if (isPlace(v)) s21Villages[v] = 1;
  });

  /* संकल्प दूत। जगह वैसे ही गिनी जाती है जैसे इंकलाब 28 में, क्योंकि फ़ॉर्म
     में वही तीन खाने हैं : जिला, राज्य, और हाथ से लिखा हुआ देश। जगह
     kahanSe() से आती है, जो सब फ़ॉर्मों के लिए एक ही विधि है।

     गिनती व्यक्तियों की है, परिवारों की नहीं : एक पंक्ति यानी एक संकल्प दूत। */
  var sdGaon = {}, sdJile = {}, sdRajya = {}, sdDesh = {};
  var gSD = colOf(ss, FORMS.sankalpDoot, 'gaon');
  var iSD = jagahIdx(ss, FORMS.sankalpDoot);
  sdRows.forEach(function (r) {
    if (gSD >= 0) { var v = normPlace(r[gSD]); if (isPlace(v)) sdGaon[v] = 1; }

    var j = kahanSe(r, iSD);
    if (j && j.kya === 'देश')       sdDesh[j.naam] = 1;
    else if (j && j.kya === 'राज्य') sdRajya[j.naam] = 1;
    else if (j)                      sdJile[j.naam] = 1;
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

  /* पूरे अभियान की भौगोलिक पहुँच : जिले, राज्य और देश, हर फ़ॉर्म से जुड़कर।

     गाँवों की तरह यहाँ भी एक जगह एक बार गिनी जाती है। जो जिला संकल्प 21 में
     भी आया और इंकलाब 28 में भी, वह एक जिला है, दो नहीं। व्यक्तियों की गिनती
     इसकी उलटी है, वह हर बार गिने जाते हैं, क्योंकि वह काम है और यह जगह।

     दसों फ़ॉर्म इसमें हैं। सात फ़ॉर्मों में सिर्फ़ जिले का खाना है, इसलिए उनसे
     जिले ही आते हैं; राज्य और देश इंकलाब 28 तथा संकल्प दूत से आते हैं, जहाँ
     वे खाने बने हैं। */
  var kulJileSet = {}, kulRajyaSet = {}, kulDeshSet = {};
  [[sankalpRows, FORMS.sankalp], [sabhaRows, FORMS.sabha],
   [kahaniRows, FORMS.kahani], [shikshakRows, FORMS.shikshak],
   [yuvaRows, FORMS.yuva], [sammanRows, FORMS.samman],
   [s21Rows, FORMS.sankalp21], [k21Rows, FORMS.karuna21],
   [i28Rows, FORMS.inqlab28], [sdRows, FORMS.sankalpDoot]].forEach(function (pair) {
    var idx = jagahIdx(ss, pair[1]);
    pair[0].forEach(function (r) {
      var j = kahanSe(r, idx);
      if (!j) return;
      if (j.kya === 'जिला')       kulJileSet[j.naam] = 1;
      else if (j.kya === 'राज्य') kulRajyaSet[j.naam] = 1;
      else                        kulDeshSet[j.naam] = 1;
    });
  });
  /* राजस्थान और भारत अपनी-अपनी सूची में अलग से जोड़े जाते हैं।

     फ़ॉर्म में राजस्थान का आदमी अपना जिला चुनता है, "राजस्थान" नहीं; और
     भारत का आदमी अपना राज्य चुनता है, "भारत" नहीं। इसलिए ऊपर की सूचियों में
     राजस्थान से बाहर के राज्य और भारत से बाहर के देश ही आते हैं। उन्हीं को
     "भारत के राज्य" और "देश" कहकर छाप देना झूठ होता : जिस राज्य से यह
     अभियान चल रहा है वही उसमें से छूट जाता।

     इसलिए : एक भी जिला जुड़ा है तो राजस्थान जुड़ा है, और एक भी जिला या राज्य
     जुड़ा है तो भारत जुड़ा है। दोनों अनुमान नहीं हैं, आँकड़े से निकली बात हैं। */
  var kulJileN  = Object.keys(kulJileSet).length;
  var rajyaAnya = Object.keys(kulRajyaSet).length;
  var deshAnyaN = Object.keys(kulDeshSet).length;

  var stats = {
    gaon:       Object.keys(villages).length,
    sabhaen:    sabhaRows.length,
    samitiyan:  samitiyan,
    // One consolidated number. The two halves are published too, so the
    // dashboard can always show where the figure came from.
    /* एक आदमी ने अगर सभा में भी हिस्सा लिया, संकल्प 21 भी किया, इंकलाब 28
       में भी नाम लिखाया और संकल्प दूत भी बना, तो वह चारों बार गिना जाता है।
       यह जान-बूझकर है : यह संख्या लोगों की नहीं, लिए गए संकल्पों की है। गाँव
       इसके उलटे एक बार ही गिना जाता है, क्योंकि वह जगह है, काम नहीं।

       इंकलाब 28 के व्यक्ति परिवार के सदस्य हैं, जिन्होंने ख़ुद फ़ॉर्म नहीं भरा।
       सभा के प्रतिभागी भी ऐसे ही गिने जाते हैं, आयोजक संख्या लिखता है। इसलिए
       दोनों एक ही तरह के हैं और एक ही संख्या में जुड़ते हैं। हर हिस्सा अलग से भी
       भेजा जाता है, ताकि कोई पूछे तो बताया जा सके कि यह संख्या किससे बनी है। */
    sankalp:         sankalpRows.length + sabhaPratibhagi + s21Rows.length +
                     k21Rows.length + i28Vyakti + sdRows.length,
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
    // संकल्प दूत : स्वयंसेवक। यह संख्या मुख्य "संकल्प" वाली गिनती से अलग
    // रखी गई है, क्योंकि संकल्प लेना और स्वयंसेवक बनना एक बात नहीं है।
    dootKul:    sdRows.length,
    dootGaon:   Object.keys(sdGaon).length,
    dootJile:   Object.keys(sdJile).length,
    dootRajya:  Object.keys(sdRajya).length,
    dootDesh:   Object.keys(sdDesh).length,
    /* पूरे अभियान की पहुँच, सब फ़ॉर्म जोड़कर। मुखपृष्ठ पर यही तीन छपती हैं।
       राजस्थान के जिले कुल 41 हैं, इसलिए jileKul भी भेजा जाता है : "41 में
       से 41" लिखा जा सके, और सूची बढ़े तो पृष्ठ अपने आप सही रहे। */
    kulJile:      kulJileN,
    jileKul:      Object.keys(RAJ_JILA).length,
    kulRajya:     rajyaAnya + (kulJileN > 0 ? 1 : 0),
    kulDesh:      deshAnyaN + (kulJileN > 0 || rajyaAnya > 0 ? 1 : 0),
    // नाम भी, ताकि कोई पूछे तो गिनती के पीछे की सूची दिखाई जा सके
    kulJileSuchi:  Object.keys(kulJileSet).sort(),
    kulRajyaSuchi: Object.keys(kulRajyaSet).sort(),
    kulDeshSuchi:  Object.keys(kulDeshSet).sort(),
    sahayata:   0        // no form feeds this; set it in the मैनुअल आँकड़े tab
  };

  /* जिलेवार तालिका। मुखपृष्ठ की संख्याएँ और यह तालिका एक ही आँकड़े से बनें,
     वरना पढ़ने वाला जोड़कर पकड़ लेता है, और ठीक ही पकड़ता है।

     2 अक्तूबर तक यह तालिका सिर्फ़ तीन फ़ॉर्म पढ़ती थी : सभा, ऑनलाइन संकल्प,
     और संकल्प 21। नतीजा यह था कि उसका संकल्प जोड़ 2,07,926 बनता था जबकि
     मुखपृष्ठ 2,25,389 कहता था, जुड़े गाँव 1,373 बनते थे जबकि मुखपृष्ठ 3,198
     कहता था, और चार जिले (चित्तौड़गढ़, प्रतापगढ़, भरतपुर, सलूम्बर) तालिका में
     थे ही नहीं, क्योंकि वे सिर्फ़ इंकलाब 28 से जुड़े थे।

     अब वही फ़ॉर्म, उसी आधार पर गिने जाते हैं जिनसे मुखपृष्ठ की संख्या बनती
     है। जिस पंक्ति से जिला नहीं निकलता (राजस्थान से बाहर का कोई, या जिसने
     "अन्य" चुना) वह jilaBahar में जाती है। वह छिपाई नहीं जाती : स्तंभ जोड़ने
     पर ठीक मुखपृष्ठ वाली संख्या बननी चाहिए, कुछ चुपचाप ग़ायब नहीं होना
     चाहिए।

     सभाएँ और समितियाँ सिर्फ़ सभा फ़ॉर्म से आती हैं, क्योंकि वे उसी की बातें
     हैं। गाँव वहीं से आते हैं जहाँ से मुखपृष्ठ का गाँव वाला आँकड़ा आता है। */
  var byDistrict = {}, bahar = { gaon: {}, sabhaen: 0, samitiyan: 0, sankalp: 0 };
  var khana = function (jila) {
    if (!jila) return bahar;
    if (!byDistrict[jila]) byDistrict[jila] = { gaon: {}, sabhaen: 0, samitiyan: 0, sankalp: 0 };
    return byDistrict[jila];
  };
  /* एक फ़ॉर्म की सब पंक्तियाँ : जिला और गाँव हर जगह एक ही तरह निकलते हैं,
     इसलिए वह यहीं हो जाता है; बाकी जो गिनना है वह kaam बताता है। */
  var jilewar = function (rowsArr, spec, kaam) {
    var idx = jagahIdx(ss, spec);
    var g = colOf(ss, spec, 'gaon');
    rowsArr.forEach(function (r) {
      var j = kahanSe(r, idx);
      var b = khana(j && j.kya === 'जिला' ? j.naam : '');
      if (g >= 0) { var v = normPlace(r[g]); if (isPlace(v)) b.gaon[v] = 1; }
      if (kaam) kaam(b, r);
    });
  };
  var ek = function (b) { b.sankalp++; };
  jilewar(sankalpRows, FORMS.sankalp,    ek);
  jilewar(s21Rows,     FORMS.sankalp21,  ek);
  jilewar(k21Rows,     FORMS.karuna21,   ek);
  jilewar(sdRows,      FORMS.sankalpDoot, ek);
  jilewar(i28Rows,     FORMS.inqlab28,   function (b, r) { b.sankalp += i28Kul(r); });
  jilewar(sabhaRows,   FORMS.sabha,      function (b, r) {
    b.sabhaen++;
    if (nIdx >= 0) b.sankalp += count(r[nIdx]);   // same basis as the headline figure
    if (samitiIdx >= 0 && String(r[samitiIdx] || '').trim() === 'हाँ') b.samitiyan++;
  });
  // इन दोनों में संकल्प नहीं गिना जाता, पर इनके गाँव भी जुड़े हुए गाँव हैं
  jilewar(kahaniRows,  FORMS.kahani, null);
  jilewar(yuvaRows,    FORMS.yuva,   null);

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
  // तालिका की आख़िरी पंक्ति : जिनका जिला दर्ज नहीं हुआ या जो राजस्थान से
  // बाहर के हैं। इसी से स्तंभ जोड़ने पर मुखपृष्ठ वाली संख्या बनती है।
  stats.jilaBahar = { gaon: Object.keys(bahar.gaon).length, sabhaen: bahar.sabhaen,
                      samitiyan: bahar.samitiyan, sankalp: bahar.sankalp };

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
