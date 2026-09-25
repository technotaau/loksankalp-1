/* लोकसंकल्प, progressive enhancement only.
   Everything on the site works with JavaScript disabled. */
(function () {
  'use strict';

  /* --- GA4 ---------------------------------------------------------------

     आईडी js/config.js में है। यहाँ तीन फ़ैसले लिए गए हैं, और तीनों की वजह है।

     १. Do Not Track पहले देखा जाता है, बाकी सब उसके बाद। जिस पाठक ने अपने
        ब्राउज़र में यह चालू कर रखा है, उसके लिए यह पूरा हिस्सा चलता ही नहीं
        और गूगल की एक भी पंक्ति नहीं उतरती।

     २. गूगल की फ़ाइल लगभग 100 KB की है, और यह वेबसाइट 2G वाले फ़ोनों के लिए
        बनी है। इसलिए वह पेज खुलने के बाद, फ़ुर्सत मिलने पर उतरती है, पहले
        नहीं। तब तक जो घटनाएँ होती हैं वे dataLayer में जमा रहती हैं और फ़ाइल
        आते ही एक साथ चली जाती हैं, इसलिए गिनती में कुछ छूटता नहीं। ढाई
        सेकंड की सीमा इसलिए है कि फ़ुर्सत कभी न मिले तो भी वह उतर जाए।

     ३. विज्ञापन वाले दोनों संकेत बंद हैं। यह वेबसाइट बच्चों और गाँव के लोगों
        की जानकारी लेती है; उसे किसी विज्ञापन तंत्र से जोड़ने का कोई कारण नहीं।

     फ़ॉर्म में लिखा कोई शब्द यहाँ नहीं जाता। नीचे जो घटनाएँ भेजी जाती हैं
     उनमें केवल यह होता है कि कौन-सा काम हुआ और किस फ़ॉर्म पर, बस। */
  var track = function () {};
  (function () {
    var ID = (window.LOKSANKALP_GA4 || '').trim();
    if (!ID) return;
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') return;

    window.dataLayer = window.dataLayer || [];
    var gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    track = function (naam, kya) {
      try { gtag('event', naam, kya || {}); } catch (e) { /* गिनती के लिए पेज रोकना नहीं है */ }
    };

    var utaaro = function () {
      if (document.getElementById('ls-ga')) return;
      var s = document.createElement('script');
      s.id = 'ls-ga'; s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
      document.head.appendChild(s);
    };
    if (window.requestIdleCallback) window.requestIdleCallback(utaaro, { timeout: 2500 });
    else window.setTimeout(utaaro, 2000);
  }());

  /* --- Mobile navigation ------------------------------------------------ */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var header = document.querySelector('.site-header');
  if (toggle && nav) {
    toggle.hidden = false;

    // The open menu is a fixed panel that starts below the header. The header's
    // height depends on how the brand tagline wraps, which differs across phone
    // widths, so measure it instead of assuming a value.
    var syncHeaderHeight = function () {
      if (!header) return;
      document.documentElement.style.setProperty(
        '--ls-header-h', Math.round(header.getBoundingClientRect().height) + 'px');
    };
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('orientationchange', syncHeaderHeight);
    if (window.ResizeObserver && header) new ResizeObserver(syncHeaderHeight).observe(header);
    var setOpen = function (open) {
      if (open) syncHeaderHeight();
      toggle.setAttribute('aria-expanded', String(open));
      nav.setAttribute('data-open', String(open));
      document.documentElement.style.overflow = open && window.innerWidth < 992 ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.innerWidth < 992) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false); toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 992) document.documentElement.style.overflow = '';
    });
  }

  /* --- Impact counters: count up once, when scrolled into view ---------- */
  var nf = new Intl.NumberFormat('en-IN');
  var counters = document.querySelectorAll('[data-count]');
  /* The count-up writes to the element for 1400ms after it starts, so a
     figure that arrives mid-flight used to be overwritten by the old one the
     animation was still counting towards. That is not hypothetical: the
     figures below the करुणा 21 form scroll into view at the very moment a
     submission refreshes them, and the block was left showing the number
     from before the person's own entry.

     Two guards. The target is re-read every frame, so a figure that moves
     mid-animation is counted towards its new value. And each run takes a
     ticket; a later run, or a direct write from paint(), invalidates the
     earlier one instead of racing it. */
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var mine = (el._lsRun = (el._lsRun || 0) + 1);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = nf.format(target); return; }
    var start = performance.now(), dur = 1400;
    var tick = function (now) {
      if (el._lsRun !== mine) return;              // a newer write took over
      var moved = parseInt(el.getAttribute('data-count'), 10);
      if (!isNaN(moved)) target = moved;           // the figure changed mid-flight
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = nf.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* --- Reveal on scroll ------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // A counter still waiting on the Sheet has data-count="0";
        // animating it here is what painted the 0 people saw.
        if (el.hasAttribute('data-count')) { if (!el.hasAttribute('data-loading')) runCounter(el); }
        else el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    counters.forEach(function (el) { io.observe(el); });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    counters.forEach(function (el) { if (!el.hasAttribute('data-loading')) runCounter(el); });
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* संकल्प 21 वाला पुराना swap यहाँ से हटा दिया गया है।

     वह नीचे की पट्टी का पहला बटन 3 अक्टूबर तक "संकल्प 21" कर देता था। जब
     वह लिखा गया था तब उस पृष्ठ पर फ़ॉर्म था। अब वह पृष्ठ "जो हुआ" का रिकॉर्ड
     है, उस पर करने को कुछ नहीं। नतीजा यह होता कि 29 सितम्बर को इंकलाब 28 का
     फाटक बंद होते ही फ़ोन का सबसे बड़ा बटन चार दिन तक एक बीत चुके आयोजन पर
     भेजता रहता, और कोई देख भी नहीं रहा होता।

     अब वह पट्टी अपने आप "संकल्प लें" पर लौट आती है, जो हर दिन काम का है।
     अभियान के दिनों में data-camp-swap उसे वैसे ही बदल देता है जैसे पहले। */

  /* --- आज का अभियान ------------------------------------------------------
     One campaign day at a time is the live action: करुणा 21 on 21 September,
     इंकलाब 28 on the 28th, and संयम स्वराज on 2 October after it. Rather than
     a third copy of the same switching code, the markup names which campaign
     a card, a button or a menu item belongs to, and the table below says when
     that campaign is open. Adding the next one is a line here and an
     attribute there, not another block like this.

     Written as UTC so a phone set to any timezone turns at the same moment,
     and each campaign's dates live in exactly one place: the page, the home
     card, the menu and the popup all read these. Three copies of a date is
     three chances for them to disagree, and the copy that disagrees is always
     found by a villager on the day rather than by me. */

  var CAMPAIGNS = {
    // करुणा 21 : बीत चुका। तिथियाँ रिकॉर्ड के लिए रखी हैं।
    karuna21: { opens: Date.UTC(2026, 8, 20, 14, 30),   // 20 सित॰ 20:00 IST
                closes: Date.UTC(2026, 8, 22, 18, 30) },  // 23 सित॰ 00:00 IST
    // इंकलाब 28 : भगत सिंह जयंती। पंजीकरण दिन से पहले ही खुल जाता है, क्योंकि
    // यह उस दिन उपवास रखने का संकल्प है, उस दिन की रिपोर्ट नहीं।
    inqlab28: { opens: Date.UTC(2026, 8, 22, 18, 30),   // 23 सित॰ 00:00 IST
                closes: Date.UTC(2026, 8, 28, 18, 30),    // 29 सित॰ 00:00 IST
                day: Date.UTC(2026, 8, 27, 18, 30) }      // 28 सित॰ 00:00 IST
  };

  var NOW = Date.now();
  var isLive = function (key) {
    var c = CAMPAIGNS[key];
    return !!c && NOW >= c.opens && NOW < c.closes;
  };
  // Which campaign, if any, the site should be leading with right now. The
  // first one whose window is open wins; normally only one ever is.
  var today = Object.keys(CAMPAIGNS).filter(isLive)[0] || '';

  /* While a campaign is the live action the home page leads with it and the
     standing card steps aside, so nobody is sent to yesterday's task. Every
     one of these reverts on its own when the window shuts. */
  if (today) {
    var mine = function (sel) {
      return Array.prototype.filter.call(document.querySelectorAll(sel), function (n) {
        var k = n.getAttribute('data-camp');
        return !k || k === today;
      });
    };
    mine('[data-camp-card]').forEach(function (n) { n.hidden = false; });

    // The hero leads with it too. Whatever was the primary button steps down
    // to a ghost: two filled buttons side by side would put the visitor back
    // to choosing, which is the confusion this is meant to end.
    mine('[data-camp-hero]').forEach(function (n) { n.hidden = false; });

    /* The menu item and the phone's sticky bar point at the campaign for
       these days and go back afterwards. They carry the evergreen label in
       the markup so that a closed form is never advertised: this is the pair
       that had once been hard-coded and would have kept pointing at a finished
       campaign long after its form shut. */
    mine('[data-camp-swap]').forEach(function (a) {
      var href = a.getAttribute('data-camp-href');
      var label = a.getAttribute('data-camp-label');
      var icon = a.getAttribute('data-camp-icon');
      if (href) a.setAttribute('href', href);
      if (label) Array.prototype.forEach.call(a.childNodes, function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) n.textContent = label;
      });
      var use = icon && a.querySelector('use');
      if (use) use.setAttribute('href', 'assets/img/icons.svg#' + icon);
    });
    document.querySelectorAll('[data-hero-demote]').forEach(function (n) {
      n.classList.remove('btn--primary');
      n.classList.add('btn--ghost');
    });

    /* जिस दिन कोई अभियान चल रहा है, उस दिन बाकी बटन हट जाते हैं।

       मुखपृष्ठ पर तीन बटन एक साथ थे और तीनों मेन्यू में तथा नीचे की पट्टी
       में भी हैं। पढ़ने वाले को यह चुनना पड़ता था कि किस पर दबाए, जबकि इन
       दिनों करने को एक ही काम है। एक ही बटन रहने पर सवाल ही नहीं बचता।

       मिटाया इसलिए नहीं गया कि 29 सितम्बर को इंकलाब वाला बटन अपने आप हट
       जाएगा; अगर बाकी दोनों मिटा दिए होते तो उस दिन मुखपृष्ठ पर एक भी बटन
       न बचता और किसी को याद करके वापस लगाना पड़ता। अब वे उसी दिन अपने आप
       लौट आएँगे। JavaScript बंद हो तो वे दिखते ही रहते हैं, यानी बिना
       JavaScript वाले फ़ोन पर पृष्ठ कभी बटन-विहीन नहीं होता। */
    document.querySelectorAll('[data-camp-hide]').forEach(function (n) {
      n.hidden = true;
    });
  }

  /* बचे हुए दिन।

     "28 सितम्बर को उपवास रखना है" पढ़कर आदमी सोचता है कि बाद में देख लेंगे।
     "अब केवल तीन दिन बाकी" पढ़कर वही आदमी अभी भर देता है। इसीलिए यह गोली
     लगाई गई है।

     दिन की गिनती भारतीय समय की आधी रात से होती है, घंटों से नहीं : गाँव में
     कोई नहीं कहता "साढ़े इकसठ घंटे बाकी हैं"। तारीख़ उसी CAMPAIGNS तालिका से
     आती है, इसलिए 29 सितम्बर को यह अपने आप गायब हो जाती है और किसी को हाथ
     से हटाना नहीं पड़ता। JavaScript बंद हो तो गोली छिपी ही रहती है, यानी
     कभी कोई पुरानी गिनती नहीं दिखती। */
  var DIN = 24 * 60 * 60 * 1000;
  var daysLeft = function (key) {
    var c = CAMPAIGNS[key];
    if (!c || !c.day) return null;
    // दोनों सिरों को IST की आधी रात पर ले आइए, फिर घटाइए.
    var ist = function (t) { return Math.floor((t + 5.5 * 60 * 60 * 1000) / DIN); };
    return ist(c.day) - ist(NOW);
  };
  document.querySelectorAll('[data-camp-days]').forEach(function (n) {
    var k = n.getAttribute('data-camp');
    var d = daysLeft(k);
    if (d === null || d < 0 || !isLive(k)) { n.hidden = true; return; }
    n.textContent = d === 0 ? 'आज ही है'
                  : d === 1 ? 'कल ही है'
                  : 'अब केवल ' + d + ' दिन बाकी';
    n.classList.toggle('days-pill--today', d <= 1);
    n.hidden = false;
  });

  /* The campaign's own menu item ships VISIBLE, the other way round from the
     cards below. A phone with JavaScript off should still find today's
     action from the menu, and the form stays reachable after the window
     anyway, so showing it a little too long costs nothing. What it must not
     do is sit there for a campaign whose day has passed while a newer one is
     running, so the item is taken out once its window shuts. */
  document.querySelectorAll('[data-camp-nav]').forEach(function (a) {
    var k = a.getAttribute('data-camp');
    if (k && k !== today) (a.closest('li') || a).hidden = true;
  });

  /* A campaign's own form ships hidden and is revealed at its hour, so
     nobody sends anything before the day and nobody has to remember to switch
     it on. Hidden is the safe default: if this file never runs the page still
     explains what the campaign is and when it opens.

     It opens at the hour and then stays open, deliberately. Somebody who
     hears about it a day late should be able to join rather than meet a shut
     door; what closes on time is the advertising above, not the form. */
  Object.keys(CAMPAIGNS).forEach(function (key) {
    if (NOW < CAMPAIGNS[key].opens) return;
    var only = '[data-camp="' + key + '"]';
    document.querySelectorAll('[data-camp-form]' + only).forEach(function (n) { n.hidden = false; });
    document.querySelectorAll('[data-camp-wait]' + only).forEach(function (n) { n.hidden = true; });
    document.querySelectorAll('[data-camp-count]' + only).forEach(function (n) { n.hidden = false; });
  });

  /* --- खाने जो ज़रूरत पड़ने पर ही खुलते हैं -------------------------------
     इंकलाब 28 अब राजस्थान से बाहर और भारत से बाहर के लोग भी भरते हैं। सवाल
     फ़ॉर्म के सबसे ऊपर, दिखता हुआ, और राजस्थान पहले से चुना हुआ, इसलिए
     राजस्थान वाले को छूना ही नहीं पड़ता, और बाहर वाले को पहली नज़र में पता चल
     जाता है कि यह फ़ॉर्म उसके लिए भी है। पहले यह विकल्प जिले की सूची के भीतर
     छिपा था, जहाँ वही पहुँचता जो सूची खोलकर अंत तक जाता।

     छिपे खाने का required होना ब्राउज़र को फ़ॉर्म भेजने से चुपचाप रोक देता है,
     और रुकावट दिखती भी नहीं क्योंकि खाना परदे पर है ही नहीं। इसलिए required
     दिखने के साथ लगता है और छिपने के साथ हटता है; छिपते समय उसका भरा मान भी
     मिटता है, वरना कोई क्षेत्र बदल दे तो पुराना जिला चुपचाप साथ चला जाए। */
  (function () {
    var form = document.querySelector('form[data-demo]');
    var boxes = document.querySelectorAll('[data-show-when]');
    if (!form || !boxes.length) return;

    // The trigger may be one control with an id, or a group of radios sharing
    // a name. Reading both here keeps the markup free of a second attribute.
    var valueOf = function (key) {
      var one = document.getElementById(key);
      if (one) return one.closest('[data-show-when][hidden]') ? null : one.value;
      var picked = form.querySelector('[name="' + key + '"]:checked');
      return picked ? picked.value : '';
    };

    var apply = function () {
      // Twice: a box can hang off a control inside another box, and the inner
      // one only reads correctly once the outer one has settled.
      for (var pass = 0; pass < 2; pass++) {
        boxes.forEach(function (box) {
          var at = box.getAttribute('data-show-when').indexOf('=');
          var key = box.getAttribute('data-show-when').slice(0, at);
          var want = box.getAttribute('data-show-when').slice(at + 1);
          var live = valueOf(key) === want;
          // No early return when the state already matches. A box that ships
          // visible in the markup starts out already correct, and skipping it
          // meant its required never went on: on first load जिला was on the
          // screen but the form would have sent without one.
          box.hidden = !live;
          box.querySelectorAll('[data-req]').forEach(function (f) {
            if (live) { f.required = true; }
            else { f.required = false; f.value = ''; }
          });
        });
      }
    };

    form.addEventListener('change', apply);
    apply();
  })();

  /* --- आज का काम : one question, one button ------------------------------
     People arriving from WhatsApp met three invitations at once, संकल्प लें,
     संकल्प 21 and करुणा 21, and could not tell which was meant for today.
     This asks nothing and offers one action.

     It is deliberately narrow: only while a campaign is actually open, never
     on the page that already carries its form, and never twice for the same
     person. A popup that outstays the day it was written for is worse than no
     popup, so the window is a date, not a flag someone has to remember to
     turn off. */

  var POPUPS = {
    karuna21: {
      href: 'sankalp-21.html#karuna',
      page: /sankalp-21\.html/,
      eyebrow: '21 सितम्बर · तेजा दशमी',
      title: 'आज क्या करना है',
      text: 'उपवास के साथ एक सेवा कीजिए : गाय को गुड़, रोटी या चारा खिलाइए, ' +
            'अथवा पौधा लगाइए या पेड़ को पानी दीजिए। फिर उसकी फोटो यहाँ भेज दीजिए।',
      cta: 'करुणा 21 में फोटो भेजें'
    },
    inqlab28: {
      href: 'inqlab-28.html',
      page: /inqlab-28\.html/,
      eyebrow: '28 सितम्बर · भगत सिंह जयंती',
      title: 'इंकलाब 28 में जुड़िए',
      text: 'भगत सिंह जयंती पर सपरिवार उपवास रखिए और नशे की सामाजिक स्वीकृति ' +
            'के विरुद्ध अपना संकल्प दर्ज कीजिए।',
      cta: 'संकल्प दर्ज करें'
    }
  };

  (function () {
    var pop = POPUPS[today];
    if (!pop) return;
    var SEEN = 'ls-today-' + today;

    // already on the page that holds the form: nothing to point at
    if (pop.page.test(location.pathname)) return;

    try { if (window.localStorage.getItem(SEEN)) return; } catch (e) { /* private window */ }

    var HREF = pop.href;
    var veil = document.createElement('div');
    veil.className = 'today-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-modal', 'true');
    veil.setAttribute('aria-labelledby', 'today-h');

    var card = document.createElement('div');
    card.className = 'today-card';
    card.innerHTML =
      '<img class="today-card__mark" src="assets/img/logo-mark.svg" alt="" width="62" height="62">' +
      '<p class="eyebrow"></p>' +
      '<h2 id="today-h"></h2>' +
      '<p class="mt-2"><span class="days-pill" data-today="days" hidden></span></p>' +
      '<p class="mt-2" data-today="text"></p>' +
      '<p class="mt-2"><a class="btn btn--primary btn--lg" href="' + HREF + '" data-today="go"></a></p>' +
      '<button class="today-card__later" type="button" data-today="later">बाद में देखूँगा</button>';
    // Set as text, not built into the HTML string: campaign copy is written
    // by people and will one day contain an & or a quotation mark.
    card.querySelector('.eyebrow').textContent = pop.eyebrow;
    card.querySelector('#today-h').textContent = pop.title;
    card.querySelector('[data-today="text"]').textContent = pop.text;
    card.querySelector('[data-today="go"]').textContent = pop.cta;
    /* वही गिनती जो पृष्ठ पर है, यहाँ भी। पॉपअप एक बार ही दिखता है, और उसी
       एक बार में "अब केवल तीन दिन बाकी" पढ़ लेना पूरे संदेश से ज़्यादा काम
       करता है। */
    var popDin = daysLeft(today);
    var popPill = card.querySelector('[data-today="days"]');
    if (popPill && popDin !== null && popDin >= 0) {
      popPill.textContent = popDin === 0 ? 'आज ही है'
                          : popDin === 1 ? 'कल ही है'
                          : 'अब केवल ' + popDin + ' दिन बाकी';
      popPill.classList.toggle('days-pill--today', popDin <= 1);
      popPill.hidden = false;
    }
    veil.appendChild(card);

    var before = document.activeElement;
    var remember = function () {
      try { window.localStorage.setItem(SEEN, '1'); } catch (e) { /* nothing to do */ }
    };
    var close = function () {
      remember();
      veil.remove();
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      if (before && before.focus) before.focus();
    };
    var onKey = function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // keep the keyboard inside the card while it is open
      var can = card.querySelectorAll('a[href], button');
      if (!can.length) return;
      var first = can[0], last = can[can.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    veil.addEventListener('click', function (e) {
      if (e.target === veil) close();                       // tap outside
      if (e.target.closest('[data-today="later"]')) close();
      if (e.target.closest('[data-today="go"]')) remember(); // let the link work
    });
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(veil);
    document.documentElement.style.overflow = 'hidden';
    var go = card.querySelector('[data-today="go"]');
    if (go && go.focus) go.focus();
  })();

  /* --- Gallery district filter ------------------------------------------
     The buttons are hidden in the markup and revealed here, so a phone that
     never runs this file still shows every photograph. */

  var grid = document.querySelector('[data-gallery]');
  var filters = document.querySelector('[data-gallery-filters]');
  if (grid && filters) {
    var empty = document.querySelector('[data-gallery-empty]');
    filters.hidden = false;
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var want = btn.getAttribute('data-filter');
      filters.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var shown = 0;
      grid.querySelectorAll('.photo').forEach(function (fig) {
        var keep = !want || fig.getAttribute('data-jila') === want;
        fig.hidden = !keep;
        if (keep) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
    filters.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.classList.contains('is-on') ? 'true' : 'false');
    });
  }

  /* --- Digital certificate ----------------------------------------------
     Drawn on a canvas rather than screenshotted, so it needs no library and
     works offline once the page is open. The download button used to be a
     dead href="#"; this is what makes it real. */

  var CERT_W = 1400, CERT_H = 990;

  function loadSvg(url, w, h) {
    // An inline SVG with only a viewBox has no intrinsic size, and Chrome
    // refuses to draw such an image, so stamp the size on before loading.
    return fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
      txt = txt.replace('<svg ', '<svg width="' + w + '" height="' + h + '" ');
      var blob = new Blob([txt], { type: 'image/svg+xml' });
      var src = URL.createObjectURL(blob);
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { URL.revokeObjectURL(src); resolve(img); };
        img.onerror = function () { URL.revokeObjectURL(src); resolve(null); };
        img.src = src;
      });
    }).catch(function () { return null; });
  }

  // The wording differs per certificate (लोकसंकल्प, करुणा 21), the layout does
  // not. Defaults keep the original संकल्प certificate exactly as it was.
  var CERT_DEFAULT = {
    title: 'लोकसंकल्प प्रमाणपत्र',
    line: 'ने नशामुक्त समाज के निर्माण हेतु लोकसंकल्प लिया।',
    motto: '“नशे को नहीं, संस्कारों को सामाजिक स्वीकृति”',
    by: 'नई किरण नशा मुक्ति केंद्र, राजकीय डूंगर महाविद्यालय, बीकानेर द्वारा प्रदत्त',
    file: 'loksankalp-pramanpatra',
    share: 'मैंने नशामुक्त समाज के लिए लोकसंकल्प लिया है। अब आपकी बारी। loksankalp.org'
  };

  /* Break a sentence into lines that fit. The body of a certificate used to
     be one short clause; it can now be a paragraph, and a paragraph drawn as
     a single line runs off both edges of the page. */
  function wrapLines(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    words.forEach(function (w) {
      var next = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(next).width > maxWidth) { lines.push(cur); cur = w; }
      else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /* A one-page PDF wrapped around the certificate's own JPEG.
     No library: a PDF holding a single DCTDecode image is a few objects and
     an offset table, and pulling in a PDF library would cost this audience
     several hundred kilobytes on a 2G connection for the same one page.
     The page is A4 landscape, which the 1400x990 canvas matches to within a
     thousandth, so it prints without letterboxing. */
  function pdfFromJpeg(bytes, w, h) {
    // A4, turned to match the picture. The landscape certificates are 1400x990
    // and the portrait one 990x1400, both within a thousandth of A4's ratio,
    // so either prints edge to edge without letterboxing.
    var PW = 841.89, PH = 595.28;                 // A4 landscape, points
    if (h > w) { PW = 595.28; PH = 841.89; }      // A4 portrait
    var enc = function (str) {
      var out = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
      return out;
    };
    var chunks = [], len = 0, offsets = [];
    var put = function (u8) { chunks.push(u8); len += u8.length; };
    var obj = function (n, str) { offsets[n] = len; put(enc(n + ' 0 obj\n' + str + '\nendobj\n')); };

    put(enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + ']' +
           ' /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');

    offsets[4] = len;
    put(enc('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h +
            ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
            bytes.length + ' >>\nstream\n'));
    put(bytes);
    put(enc('\nendstream\nendobj\n'));

    var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
    offsets[5] = len;
    put(enc('5 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content +
            '\nendstream\nendobj\n'));

    var xref = len;
    var pad = function (n) { var t = '0000000000' + n; return t.slice(-10); };
    var table = 'xref\n0 6\n0000000000 65535 f \n';
    for (var i = 1; i <= 5; i++) table += pad(offsets[i]) + ' 00000 n \n';
    put(enc(table + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n'));

    return new Blob(chunks, { type: 'application/pdf' });
  }

  function loadPic(url) {
    // A photograph, not an SVG: no size to stamp on, and a missing file must
    // never stop a certificate being issued, so failure resolves to null and
    // the layout falls back to the one without it.
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function drawCertificate(naam, tarikh, spec) {
    spec = spec || CERT_DEFAULT;
    var W = spec.w || CERT_W, H = spec.h || CERT_H;
    var head = '"Tiro Devanagari Hindi", "Noto Sans Devanagari", serif';
    var body = '"Noto Sans Devanagari", system-ui, sans-serif';
    var ready = document.fonts && document.fonts.ready
      ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    return Promise.all([
      ready,
      loadSvg('assets/img/logo-mark.svg', 128, 128),
      spec.photo ? loadPic(spec.photo) : Promise.resolve(null)
    ]).then(function (out) {
        var mark = out[1], pic = out[2];
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var x = c.getContext('2d'), mid = W / 2;

        // Everything is measured against the inner border, whatever the size.
        var PAD = Math.round(W * 0.0715);
        var INNER = W - PAD * 2;
        var U = W / 1400;                 // one "unit": the original width

        /* Shrink a line until it fits. Nothing on a certificate may run past
           the border: a long name did exactly that, and so would any line if
           the web font failed to arrive and a wider fallback was used in its
           place. Measuring is the only way to be sure, because the same text
           in a different font is a different width. */
        var fit = function (text, font, maxW, floor) {
          var m = /(\d+(?:\.\d+)?)px/.exec(font);
          if (!m) return font;
          var size = parseFloat(m[1]);
          var at = function (n) { return font.replace(/(\d+(?:\.\d+)?)px/, n + 'px'); };
          while (size > (floor || 16)) {
            x.font = at(size);
            if (x.measureText(text).width <= (maxW || INNER)) break;
            size -= size > 40 ? 2 : 1;
          }
          return at(size);
        };

        /* Centred by measurement, not by textAlign.
           WebKit on iOS does not honour textAlign 'center' for Devanagari: it
           lays the text out FROM the anchor instead of centring it on it, so
           every Hindi line began at the middle and ran off the right edge,
           while the Latin name and the site address on the same certificate
           looked perfectly centred. Measuring the line and starting it half a
           width to the left asks the canvas for nothing it can get wrong. */
        var line = function (text, y, font, colour) {
          x.font = fit(text, font); x.fillStyle = colour;
          x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          x.fillText(text, mid - x.measureText(text).width / 2, y);
        };

        x.fillStyle = '#fffdf5'; x.fillRect(0, 0, W, H);

        // tricolour band across the top, the same one the site footer uses
        var bands = ['#e8730c', '#ffffff', '#1b7a34'];
        for (var i = 0; i < 3; i++) {
          x.fillStyle = bands[i];
          x.fillRect(0, i * 5, W, 5);
        }

        x.strokeStyle = '#17307a';
        x.lineWidth = 6; x.strokeRect(30, 34, W - 60, H - 64);
        x.lineWidth = 2; x.strokeRect(46, 50, W - 92, H - 96);

        /* The emblem sits in the middle on its own. When the certificate also
           carries a portrait, the two take a corner each instead, because an
           emblem in the centre with a face beside it reads as lopsided. */
        var SEAL = Math.round(116 * U);
        var top = Math.round(92 * U);
        if (pic) {
          var D = Math.round(150 * U);
          var px = PAD + Math.round(10 * U), py = top - Math.round(6 * U);
          x.save();
          x.beginPath(); x.arc(px + D / 2, py + D / 2, D / 2, 0, Math.PI * 2); x.clip();
          // cover-fit, so a portrait of any shape fills the circle uncropped
          var r = Math.max(D / pic.width, D / pic.height);
          var pw = pic.width * r, ph = pic.height * r;
          x.drawImage(pic, px + (D - pw) / 2, py + (D - ph) / 2, pw, ph);
          x.restore();
          x.strokeStyle = '#17307a'; x.lineWidth = 3 * U;
          x.beginPath(); x.arc(px + D / 2, py + D / 2, D / 2, 0, Math.PI * 2); x.stroke();
          if (mark) x.drawImage(mark, W - PAD - SEAL - Math.round(10 * U), top, SEAL, SEAL);
        } else if (mark) {
          x.drawImage(mark, mid - SEAL / 2, top, SEAL, SEAL);
        }

        var y = top + SEAL + Math.round(pic ? 62 * U : 50 * U);
        line('डिजिटल प्रमाणपत्र', y, '600 ' + (26 * U) + 'px ' + body, '#b4560a');
        y += Math.round(66 * U);
        line(spec.title, y, '700 ' + (56 * U) + 'px ' + head, '#17307a');
        y += Math.round(48 * U);
        if (spec.sub) {
          line(spec.sub, y, '600 ' + (28 * U) + 'px ' + body, '#b4560a');
          y += Math.round(44 * U);
        }
        line('यह प्रमाणित किया जाता है कि', y, '400 ' + (30 * U) + 'px ' + body, '#33405c');
        y += Math.round(84 * U);

        // fit() leaves the chosen size on the context, so the rule under the
        // name is measured from the size actually drawn, not the one asked for
        line(naam, y, fit(naam, '700 ' + (66 * U) + 'px ' + head, INNER - 60 * U, 30), '#0f5c26');
        var nw = Math.min(x.measureText(naam).width + 120 * U, INNER);
        x.strokeStyle = '#c9d2e6'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(mid - nw / 2, y + 22 * U); x.lineTo(mid + nw / 2, y + 22 * U); x.stroke();
        y += Math.round(82 * U);

        // गाँव/शहर, और उसके साथ जिला या राज्य या देश
        if (spec.sthan) {
          line(spec.sthan, y - Math.round(28 * U), '400 ' + (27 * U) + 'px ' + body, '#5a6785');
          y += Math.round(18 * U);
        }

        /* Everything below has to end above the site address at the foot, and
           the citation is now a paragraph or two rather than a clause. Rather
           than hope it fits, measure: try the body at each size from large to
           small and take the first whose whole block (paragraphs, motto,
           rule and the lines under it) finishes inside the space left.
           A certificate that runs off its own page is what this prevents, and
           it is exactly what the first long citation did. */
        var paras = (spec.paras && spec.paras.length ? spec.paras : [spec.line])
                      .filter(Boolean);
        var foot = [];
        if (spec.underline !== false) foot.push(['नशा मुक्त भारत अभियान के अंतर्गत', 23, '400', '#5a6785']);
        (spec.by ? String(spec.by).split('\n') : []).forEach(function (t) {
          if (t.trim()) foot.push([t.trim(), 23, '600', '#5a6785']);
        });
        foot.push(['दिनांक ' + tarikh, 23, '400', '#5a6785']);
        if (spec.regNo) foot.push(['पंजीकरण क्रमांक : ' + spec.regNo, 24, '700', '#17307a']);

        var bottom = H - Math.round(96 * U);      // above the site address
        var plan = null;
        /* Landscape keeps exactly the ladder it always had, so the संकल्प and
           करुणा certificates are untouched. Portrait may start larger: the
           same body set at the landscape size on a taller sheet left the
           lower half of the page empty. */
        var ladder = H > W ? [46, 42, 38, 34, 31, 29, 27, 25, 23, 21, 19, 17]
                           : [34, 31, 29, 27, 25, 23, 21, 19, 17];
        ladder.some(function (size) {
          var s = size * U;
          x.font = '400 ' + s + 'px ' + body;
          var wrapped = paras.map(function (t) { return wrapLines(x, t, INNER - 20 * U); });
          var n = wrapped.reduce(function (a, l) { return a + l.length; }, 0);
          var step = Math.round(s * 1.46);
          var gapPara = Math.round(s * 0.55);
          var h = n * step + (wrapped.length - 1) * gapPara;
          h += Math.round(30 * U) + Math.round(46 * U);                 // motto
          h += Math.round(34 * U);                                      // rule
          h += foot.length * Math.round(36 * U);
          if (y + h <= bottom) {
            plan = { s: s, wrapped: wrapped, step: step, gap: gapPara, h: h };
            return true;
          }
          return false;
        });
        // Nothing fitted even at the smallest size: draw at the smallest
        // anyway rather than returning no certificate at all.
        if (!plan) {
          var s0 = 17 * U;
          x.font = '400 ' + s0 + 'px ' + body;
          plan = {
            s: s0, step: Math.round(s0 * 1.4), gap: Math.round(s0 * 0.5),
            wrapped: paras.map(function (t) { return wrapLines(x, t, INNER - 20 * U); })
          };
        }

        /* Share out whatever room is left rather than letting it all pool at
           the foot. Some of it goes under the name so the citation is not
           crowded against it; the rest stays at the bottom, where the issuing
           block is pinned a few lines below. */
        if (plan.h) {
          var slack = bottom - y - plan.h;
          if (slack > 0) y += Math.min(slack * 0.5, 220 * U);
        }

        var bodyFont = '400 ' + plan.s + 'px ' + body;
        plan.wrapped.forEach(function (lines, k) {
          if (k) y += plan.gap;
          lines.forEach(function (t) { line(t, y, bodyFont, '#33405c'); y += plan.step; });
        });

        y += Math.round(30 * U);
        line(spec.motto, y, '700 ' + (36 * U) + 'px ' + head, '#b4560a');
        y += Math.round(46 * U);

        /* The issuing block belongs at the foot of a certificate, not wherever
           the citation happened to end. Pinned there unless the text has
           already run that far down, in which case it simply follows on. */
        var footStep = Math.round(36 * U);
        // The rule sits far enough up that the LAST footer baseline lands on
        // `bottom`: one gap for the rule, then one step per line after the first.
        var pinned = bottom - Math.round(34 * U) - (foot.length - 1) * footStep;
        if (pinned > y) y = pinned;

        x.strokeStyle = '#e3e8f2'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(mid - INNER / 2 + 20 * U, y); x.lineTo(mid + INNER / 2 - 20 * U, y); x.stroke();
        y += Math.round(34 * U);

        foot.forEach(function (f) {
          line(f[0], y, f[2] + ' ' + (f[1] * U) + 'px ' + body, f[3]);
          y += footStep;
        });

        line('loksankalp.org', H - Math.round(52 * U), '700 ' + (24 * U) + 'px ' + body, '#1b7a34');

        return new Promise(function (resolve) {
          // JPEG, because the PDF embeds these bytes as they are and a PNG
          // would have to be re-encoded. Also a tenth of the size to send.
          c.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.92);
        });
      });
  }

  // A page may carry more than one certificate (संकल्प 21 registers, करुणा 21
  // certifies). Each lives inside its own [data-cert-scope] with its own
  // buttons, so nothing is wired to a single hard-coded id any more.
  document.querySelectorAll('[data-cert-scope]').forEach(function (scope) {
    var certBox = scope.querySelector('.certificate');
    if (!certBox) return;

    var d = certBox.dataset;
    var spec = {
      title: d.certTitle || CERT_DEFAULT.title,
      sub:   d.certSub   || '',
      line:  d.certLine  || CERT_DEFAULT.line,
      // A citation can run to more than one paragraph. Two attributes rather
      // than one with a separator: an attribute that has to be parsed is an
      // attribute that will one day be mis-typed.
      paras: [d.certLine || CERT_DEFAULT.line, d.certLine2].filter(Boolean),
      motto: d.certMotto || CERT_DEFAULT.motto,
      // an empty data-cert-by means the body already names the institution
      by:    d.certBy === undefined ? CERT_DEFAULT.by : d.certBy,
      // some certificates carry their issuer in full at the foot and do not
      // want the campaign line above it as well
      underline: d.certUnderline !== 'no',
      photo: d.certPhoto || '',
      w:     parseInt(d.certW, 10) || CERT_W,
      h:     parseInt(d.certH, 10) || CERT_H,
      file:  d.certFile  || CERT_DEFAULT.file,
      share: d.certShare || CERT_DEFAULT.share
    };

    var dlBtn = scope.querySelector('[data-cert="download"]');
    var shBtn = scope.querySelector('[data-cert="share"]');
    var fbBtn = scope.querySelector('[data-cert="facebook"]');
    var xBtn  = scope.querySelector('[data-cert="x"]');
    var certMsg = scope.querySelector('[data-cert="status"]');
    var say = function (t) { if (certMsg) certMsg.textContent = t || ''; };

    var certName = function () {
      var el = certBox.querySelector('[data-slot="naam"]');
      var v = el ? el.textContent.trim() : '';
      return v && v !== 'आपका नाम' ? v : 'लोकसंकल्प साथी';
    };
    var certDate = function () {
      var el = certBox.querySelector('[data-slot="date"]');
      return el ? el.textContent.trim() : '';
    };
    var certSthan = function () {
      var el = certBox.querySelector('[data-slot="sthan"]');
      return el ? el.textContent.trim() : '';
    };
    /* The registration number comes back from the script after the row is
       written, so it is read at build time, not when the page loaded. If the
       save did not reach the server there is no number, and the certificate
       is drawn without that line rather than with an invented one. */
    var certRegNo = function () {
      var el = certBox.querySelector('[data-slot="regno"]');
      var v = el ? el.textContent.trim() : '';
      return /^[A-Z0-9-]{4,}$/.test(v) ? v : '';
    };
    var stem = function () {
      return spec.file + '-' +
        certName().replace(/[^ऀ-ॿ\w]+/g, '-').replace(/^-|-$/g, '');
    };

    var build = function () {
      spec.regNo = certRegNo();
      spec.sthan = certSthan();
      return drawCertificate(certName(), certDate(), spec);
    };

    var save = function (blob, name) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    };

    // The PDF is what people asked for, to keep and to print. The image is
    // what actually travels on WhatsApp, and it is the share button below
    // that sends it, so nothing here needs a second download button.
    if (dlBtn) dlBtn.addEventListener('click', function () {
      say('प्रमाणपत्र तैयार हो रहा है…');
      build().then(function (blob) {
        if (!blob) throw new Error('no blob');
        return blob.arrayBuffer().then(function (buf) {
          save(pdfFromJpeg(new Uint8Array(buf), spec.w, spec.h), stem() + '.pdf');
          say('प्रमाणपत्र डाउनलोड हो गया।');
          track('pramanpatra', { form: spec.file || '' });
        });
      }).catch(function () { say('प्रमाणपत्र नहीं बन सका। कृपया दोबारा प्रयास करें।'); });
    });

    /* Facebook and X take a link, never a picture: whatever is posted through
       them carries the campaign page's own preview image, not this person's
       certificate. So these open a ready-made post and say plainly that the
       certificate itself has to be attached by hand. On a phone the share
       button above does send the real picture, which is why it comes first. */
    /* Whatever page this certificate is on. It used to be one hard-coded
       address, which meant a certificate issued anywhere else would have sent
       people to संकल्प 21. The canonical tag is the page's own published
       address, which is exactly what a shared link should be. */
    var canon = document.querySelector('link[rel="canonical"]');
    var PAGE = (canon && canon.href) || location.href.split('#')[0];
    var social = function (btn, url) {
      if (!btn) return;
      btn.addEventListener('click', function () {
        window.open(url(), '_blank', 'noopener,width=640,height=640');
        say('पोस्ट खुल गई है। डाउनलोड किया प्रमाणपत्र उसमें जोड़ लें।');
      });
    };
    social(fbBtn, function () {
      return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(PAGE) +
             '&quote=' + encodeURIComponent(spec.share);
    });
    social(xBtn, function () {
      return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(spec.share) +
             '&url=' + encodeURIComponent(PAGE);
    });

    // Sharing the image straight to WhatsApp is what actually spreads this,
    // so the button only appears where the browser can really do it.
    if (shBtn && navigator.canShare) {
      try {
        var probe = new File([new Blob([''], { type: 'image/jpeg' })], 'p.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [probe] })) shBtn.hidden = false;
      } catch (e) { /* leave hidden */ }
    }
    if (shBtn) shBtn.addEventListener('click', function () {
      say('प्रमाणपत्र तैयार हो रहा है…');
      build().then(function (blob) {
        var file = new File([blob], stem() + '.jpg', { type: 'image/jpeg' });
        return navigator.share({ files: [file], title: spec.title, text: spec.share });
      }).then(function () { say(''); })
        .catch(function () { say('साझा नहीं हो सका। आप प्रमाणपत्र डाउनलोड करके भेज सकते हैं।'); });
    });
  });

  /* --- Live figures ----------------------------------------------------
     Counters start at 0 in the HTML and are raised once the real numbers
     arrive from the Sheet. If the request fails they simply stay at 0 rather
     than showing anything invented. */

  var statEls = document.querySelectorAll('[data-stat]');
  var CACHE_KEY = 'ls-stats-v2';
  var CACHE_MAX_AGE = 24 * 60 * 60 * 1000;   // a day; figures only ever climb

  function cached() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || !box.s || (Date.now() - box.t) > CACHE_MAX_AGE) return null;
      return box.s;
    } catch (e) { return null; }        // private windows throw on read
  }

  function remember(stats) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), s: stats }));
    } catch (e) { /* storage full or blocked; the page works without it */ }
  }

  // animate === false writes the number straight in, used when a figure is
  // already on screen and would only jitter if it counted up again.
  function paint(stats, animate) {
    /* "राजस्थान के जिले" वाला आँकड़ा और नीचे की सूची, दोनों एक ही संख्या पर
       रहें। ड्रॉपडाउन का "अन्य" कोई जिला नहीं है, पर सर्वर v17 तक उसे भी एक
       जिला गिन लेता था; नतीजा यह कि काउंटर 14 कहता और सूची में 13 नाम दिखते।
       कोई भी गिनकर पकड़ सकता था। यहाँ संख्या उसी सूची से निकाली जाती है जो
       पृष्ठ पर दिखाई दे रही है, यानी पृष्ठ वही कहता है जो वह दिखा सकता है।
       v18 में सर्वर भी यही गिनेगा, तब यह पंक्ति अपने आप बेअसर हो जाएगी। */
    if (stats && stats.inqlabByJila) {
      stats.inqlabJile = stats.inqlabByJila.filter(function (r) {
        return r.naam !== JILA_ANYA;
      }).length;
    }
    var painted = false;
    Array.prototype.forEach.call(statEls, function (el) {
      var v = stats[el.getAttribute('data-stat')];
      var box = el.closest ? el.closest('.counter') : null;
      if (typeof v !== 'number') {
        // An older deployed script does not send every figure this page asks
        // for. Showing the literal 0 from the markup would be a lie, so the
        // whole counter goes rather than stating a number nobody counted.
        if (box && el.hasAttribute('data-loading')) box.classList.add('counter--empty');
        return;
      }
      // A counter reading 0 makes the movement look smaller than it is, and
      // it is not news that nothing has happened yet. It stays out of sight
      // and returns on its own the moment the first entry arrives.
      // A class, not the hidden attribute, so this never fights the date gate
      // that holds the करुणा 21 counter back until its form opens.
      if (box) box.classList.toggle('counter--empty', v === 0);
      el.setAttribute('data-count', String(v));
      el.removeAttribute('data-loading');
      // a direct write must also stop any animation still counting elsewhere
      if (animate) runCounter(el);
      else { el._lsRun = (el._lsRun || 0) + 1; el.textContent = nf.format(v); }
      painted = true;
    });
    if (painted) {
      document.querySelectorAll('[data-stats-note]').forEach(function (n) { n.hidden = true; });
    }
    renderDistricts(stats.byDistrict);
    renderJilaList(stats.inqlabByJila, stats.inqlabBahar, stats.inqlabVyakti);
    return painted;
  }

  // Called after a submission lands: the Sheet has one more row, and the
  // script drops its cache on write, so this repaints with the new figure.
  // Without it someone who has just registered would keep seeing the old
  // number until they reloaded the page.
  function refreshStats() {
    var u = (window.LOKSANKALP_FORM_ENDPOINT || '').trim();
    if (!statEls.length || !u || !window.fetch) return;
    fetch(u + '?stats=1&t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.stats) return;
        remember(res.stats);
        paint(res.stats, false);
      })
      .catch(function () { /* the figure simply stays as it was */ });
  }
  window.LOKSANKALP_REFRESH_STATS = refreshStats;

  if (statEls.length) {
    // Someone who has been here before sees their last known figures at once,
    // and the live ones replace them a moment later.
    var seen = cached();
    var shown = seen ? paint(seen, false) : false;

    var pending = window.LOKSANKALP_STATS;
    if (!pending && (window.LOKSANKALP_FORM_ENDPOINT || '').trim() && window.fetch) {
      pending = fetch((window.LOKSANKALP_FORM_ENDPOINT || '').trim() + '?stats=1')
        .then(function (r) { return r.json(); });
    }

    if (pending) {
      pending.then(function (res) {
        if (!res || !res.ok || !res.stats) throw new Error('no stats');
        remember(res.stats);
        paint(res.stats, !shown);
      }).catch(function () {
        // Nothing invented and no zeros: say plainly that the figures did not
        // arrive, unless cached ones are already on screen.
        if (shown) return;
        // In the hero an empty figure reads as a broken page, so it goes.
        document.querySelectorAll('[data-hero-stats]').forEach(function (n) { n.hidden = true; });
        document.querySelectorAll('[data-stats-note]').forEach(function (n) {
          n.hidden = false;
          n.textContent = 'आँकड़े अभी नहीं आ सके। कृपया पृष्ठ फिर से खोलें।';
        });
      });
    }
  }

  /* "यह संदेश आगे भेजिए"।

     यह अभियान WhatsApp से फैलता है, दूसरे किसी रास्ते से नहीं। भेजने का
     बटन खुद एक सादा <a href="https://wa.me/?text=…"> है, इसलिए JavaScript
     बंद हो तब भी काम करता है और फ़ोन पर सीधे WhatsApp खोल देता है।

     यहाँ केवल कॉपी वाला बटन है, उनके लिए जो संदेश किसी समूह में, फेसबुक पर
     या SMS में चिपकाना चाहते हैं। clipboard हर जगह नहीं मिलता, इसलिए वहाँ
     बटन दिखता ही नहीं, टूटा हुआ नहीं दिखता। */
  /* WhatsApp वाला बटन सादा <a> है, इसलिए उस पर क्लिक ही एकमात्र निशानी है
     कि संदेश आगे गया। यही जानना ज़रूरी है : वह बटन काम कर रहा है या नहीं। */
  document.querySelectorAll('a.btn--wa').forEach(function (a) {
    a.addEventListener('click', function () {
      track('whatsapp_bheja', { jagah: a.closest('#inqlab28-done') ? 'panjikaran-ke-baad' : 'pej-par' });
    });
  });

  document.querySelectorAll('[data-wa-copy]').forEach(function (btn) {
    var box = btn.closest('[data-share-box]');
    var src = box && box.querySelector('[data-share-msg]');
    if (!src || !navigator.clipboard || !navigator.clipboard.writeText) { btn.hidden = true; return; }
    btn.hidden = false;
    var pehla = btn.textContent;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(src.textContent.trim()).then(function () {
        btn.textContent = 'कॉपी हो गया';
        track('sandesh_copy', {});
        setTimeout(function () { btn.textContent = pehla; }, 2500);
      }).catch(function () {
        btn.textContent = 'कॉपी नहीं हो सका';
        setTimeout(function () { btn.textContent = pehla; }, 2500);
      });
    });
  });

  /* इंकलाब 28 की जिलेवार सूची।

     गाँव का आदमी अपने जिले का नाम ढूँढ़ता है। दिख जाए तो जुड़ जाता है, न
     दिखे तो उसे लाने के लिए जुड़ता है। दोनों तरफ़ से यही सूची काम करती है।

     फ़ोन पर तालिका नहीं बनाई गई : पाँच खानों वाली तालिका 360px पर टूट जाती
     है। हर जिला एक पंक्ति है, नाम बाएँ और संख्या दाएँ, और पीछे एक हल्की
     पट्टी जो बिना संख्या पढ़े बता देती है कि कौन आगे है।

     पहले आठ जिले दिखते हैं। पूरी सूची एक बटन पर खुलती है, ताकि छोटे परदे पर
     आगे का पृष्ठ चालीस जिलों के नीचे दब न जाए। */
  var MERA_JILA_KEY = 'ls-mera-jila';
  function meraJila() {
    try { return window.localStorage.getItem(MERA_JILA_KEY) || ''; }
    catch (e) { return ''; }            // निजी विंडो में पढ़ना भी विफल हो सकता है
  }
  function yaadRakho(jila) {
    try { if (jila) window.localStorage.setItem(MERA_JILA_KEY, jila); } catch (e) { /* चलने दीजिए */ }
  }

  /* ड्रॉपडाउन का आख़िरी विकल्प "अन्य" है, यानी "मेरा जिला सूची में नहीं है"।
     राजस्थान का कोई जिला इस नाम का नहीं है, इसलिए वह जिलों की सूची में
     पंक्ति बनकर नहीं बैठता : पढ़ने वाला ढूँढ़ता रह जाता कि अन्य कौन-सा जिला
     है। उसकी गिनती नीचे उसी पंक्ति में जुड़ जाती है जो बाकी बिना-जिला वाली
     पंक्तियों की बात करती है, क्योंकि पाठक के लिए दोनों एक ही बात हैं। */
  var JILA_ANYA = 'अन्य';

  function renderJilaList(list, bahar, kulVyakti) {
    var box = document.querySelector('[data-jila-list]');
    if (!box) return;
    var sec = box.closest('[data-jila-section]') || box;
    /* न आना और खाली आना, दोनों अलग बातें हैं। पुराना deploy यह सूची भेजता
       ही नहीं; तब "किसी जिले से कोई नहीं" लिखना झूठ होता। दोनों हालत में
       खंड चुपचाप छिपा रहता है। */
    if (!list || !list.length || today !== 'inqlab28') { sec.hidden = true; return; }

    list = list.filter(function (r) { return r.naam !== JILA_ANYA; });
    if (!list.length) { sec.hidden = true; return; }

    var PEHLE = 8;
    var sabse = list[0].vyakti || 1;
    var mera = meraJila();
    var nf2 = new Intl.NumberFormat('hi-IN');
    box.innerHTML = '';
    list.forEach(function (row, i) {
      var li = document.createElement('li');
      li.className = 'jila' + (row.naam === mera ? ' jila--mera' : '');
      if (i >= PEHLE) li.hidden = true;
      var bar = document.createElement('span');
      bar.className = 'jila__bar';
      bar.style.width = Math.max(6, Math.round((row.vyakti / sabse) * 100)) + '%';
      var naam = document.createElement('span');
      naam.className = 'jila__naam';
      naam.textContent = row.naam;
      var n = document.createElement('span');
      n.className = 'jila__n';
      n.textContent = nf2.format(row.vyakti);
      var small = document.createElement('small');
      small.textContent = 'व्यक्ति';
      n.appendChild(small);
      li.appendChild(bar); li.appendChild(naam); li.appendChild(n);
      box.appendChild(li);
    });
    sec.hidden = false;

    // अपना जिला सूची में नीचे हो तो पहली बार में ही दिख जाए
    var meraIndex = mera ? list.map(function (r) { return r.naam; }).indexOf(mera) : -1;

    var more = sec.querySelector('[data-jila-more]');
    if (more) {
      var chhupe = list.length - PEHLE;
      if (chhupe <= 0) { more.hidden = true; }
      else {
        more.hidden = false;
        var khula = false;
        var likho = function () {
          more.textContent = khula ? 'कम दिखाइए'
                                   : 'बाकी ' + nf2.format(chhupe) + ' जिले भी देखिए';
          more.setAttribute('aria-expanded', khula ? 'true' : 'false');
        };
        more.onclick = function () {
          khula = !khula;
          if (khula) track('jile_dekhe', {});
          Array.prototype.forEach.call(box.children, function (li, i) {
            if (i >= PEHLE) li.hidden = !khula;
          });
          likho();
        };
        likho();
        if (meraIndex >= PEHLE) more.click();   // अपना जिला छिपा न रह जाए
      }
    }

    /* जो पंक्तियाँ किसी जिले, राज्य या देश में नहीं गिनी जा सकीं।

       कुछ पुरानी पंक्तियों में जिले की जगह खाली है या "-" लिखा है। उन्हें
       किसी जिले में डाल देना गलत होता, इसलिए वे किसी सूची में नहीं आतीं।
       नतीजा यह कि ऊपर का काउंटर और नीचे की सूची का जोड़ अलग रह जाता है, और
       कोई भी जोड़कर देख सकता है। इसलिए अंतर को छिपाने के बजाय एक पंक्ति में
       कह दिया जाता है। संख्या यहीं निकाली जाती है, सर्वर से माँगी नहीं जाती,
       इसलिए इसके लिए नया deploy नहीं चाहिए। */
    var bache = sec.querySelector('[data-jila-bache]');
    if (bache) {
      var jodJila = list.reduce(function (a, r) { return a + (r.vyakti || 0); }, 0);
      // "अन्य" चुनने वाले भी इसी शेष में आते हैं, ऊपर की सूची में नहीं
      var jodBahar = (bahar || []).reduce(function (a, r) { return a + (r.vyakti || 0); }, 0);
      var shesh = (typeof kulVyakti === 'number') ? kulVyakti - jodJila - jodBahar : 0;
      if (shesh > 0) {
        bache.textContent = 'इनके अलावा ' + nf2.format(shesh) +
          ' व्यक्ति और हैं, जिनका जिला दर्ज नहीं हुआ।';
        bache.hidden = false;
      } else { bache.hidden = true; }
    }

    /* राजस्थान से बाहर वाले। नाम गिनाना ज़रूरी है : टोरंटो से भरने वाले को
       अपने देश का नाम पृष्ठ पर दिखेगा तो वह आगे भी भेजेगा। */
    /* राज्य और देश अलग-अलग पंक्तियों में।

       पहले दोनों एक ही सूची में जुड़ जाते थे, और "दुबई" मध्य प्रदेश तथा
       हरियाणा के बीच खड़ा दिखता था। सर्वर हर प्रविष्टि के साथ यह भेजता ही है
       कि वह राज्य है या देश (`kya`), बस पृष्ठ उसे काम में नहीं ले रहा था। */
    var likho = function (el, shuru, rows) {
      if (!el) return;
      if (!rows.length) { el.hidden = true; return; }
      var naam = rows.map(function (r) { return r.naam; });
      var jodo = naam.length === 1 ? naam[0]
               : naam.slice(0, -1).join(', ') + ' और ' + naam[naam.length - 1];
      var vy = rows.reduce(function (a, r) { return a + (r.vyakti || 0); }, 0);
      el.innerHTML = '';
      el.appendChild(document.createTextNode(shuru));
      var st = document.createElement('strong');
      st.textContent = jodo;
      el.appendChild(st);
      el.appendChild(document.createTextNode(' से ' + nf2.format(vy) + ' लोग जुड़े हैं।'));
      el.hidden = false;
    };
    var sab = bahar || [];
    likho(sec.querySelector('[data-jila-rajya]'), 'भारत के दूसरे राज्यों में ',
          sab.filter(function (r) { return r.kya === 'राज्य'; }));
    likho(sec.querySelector('[data-jila-desh]'), 'भारत से बाहर ',
          sab.filter(function (r) { return r.kya !== 'राज्य'; }));
  }

  /* Districts appear in the table only once a submission names them, so the
     campaign never publishes a district it has not actually reached. */
  function renderDistricts(list) {
    var body = document.querySelector('[data-district-rows]');
    if (!body) return;
    // Absent (older deployed script) is not the same as empty (no entries yet);
    // claiming "no districts" when the data simply was not sent would be wrong.
    if (!list) {
      body.innerHTML = '<tr><td colspan="5" class="center">जिलेवार आँकड़े उपलब्ध नहीं हैं।</td></tr>';
      return;
    }
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="5" class="center">अभी किसी जिले से प्रविष्टि नहीं आई है।</td></tr>';
      return;
    }
    body.innerHTML = '';
    list.forEach(function (d) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = d.jila;
      tr.appendChild(th);
      ['gaon', 'sabhaen', 'samitiyan', 'sankalp'].forEach(function (k) {
        var td = document.createElement('td');
        td.textContent = nf.format(d[k] || 0);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  /* --- Footer year ------------------------------------------------------ */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* --- Form submission -------------------------------------------------
     Posts to a Google Apps Script Web App, which appends a row to a Sheet and
     saves photos to Drive. With no endpoint configured the form still shows its
     confirmation panel, but says plainly that nothing was saved. */

  var ENDPOINT = (window.LOKSANKALP_FORM_ENDPOINT || '').trim();

  // Which data-demo id maps to which sheet in the script.
  var FORM_NAMES = {
    'sankalp-done': 'sankalp',
    'sabha-done': 'sabha',
    'kahani-done': 'kahani',
    'shikshak-done': 'shikshak',
    'yuva-done': 'yuva',
    'samman-done': 'samman',
    'sankalp21-done': 'sankalp21',
    'karuna21-done': 'karuna21',
    'inqlab28-done': 'inqlab28'
  };

  var MAX_EDGE = 1600;   // px on the long side
  var MAX_FILES = 6;

  /* A phone camera photo is 3-6 MB. Sending that raw over a village 3G link
     would take minutes and often fail outright, so shrink it in the browser
     first. That is what makes photo upload usable at all here. */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) || typeof createImageBitmap === 'undefined') {
        return resolve(readRaw(file));
      }
      createImageBitmap(file).then(function (bmp) {
        var scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
        var w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        bmp.close && bmp.close();
        canvas.toBlob(function (blob) {
          if (!blob) return resolve(readRaw(file));
          resolve(toBase64(blob, file.name.replace(/\.[^.]+$/, '') + '.jpg', 'image/jpeg'));
        }, 'image/jpeg', 0.8);
      }).catch(function () { resolve(readRaw(file)); });
    });
  }

  function readRaw(file) { return toBase64(file, file.name, file.type); }

  function toBase64(blob, name, type) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () {
        resolve({ name: name, type: type, data: String(r.result).split(',')[1] || '' });
      };
      r.onerror = function () { resolve(null); };
      r.readAsDataURL(blob);
    });
  }

  function collect(form) {
    var values = {};
    var els = form.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(els, function (el) {
      if (!el.name || el.name === 'website' || el.type === 'file' || el.type === 'submit') return;
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        var v = el.value && el.value !== 'on' ? el.value : 'हाँ';
        values[el.name] = values[el.name] ? values[el.name] + ', ' + v : v;
      } else if (el.type === 'radio') {
        if (el.checked) values[el.name] = el.value;
      } else {
        values[el.name] = el.value;
      }
    });
    return values;
  }

  function setStatus(form, text, kind) {
    var box = form.querySelector('.form-status');
    if (!box) {
      box = document.createElement('p');
      box.className = 'form-status';
      box.setAttribute('role', 'status');
      form.appendChild(box);
    }
    box.textContent = text || '';
    box.dataset.kind = kind || '';
    box.hidden = !text;
  }

  // Rising waits before each retry, in milliseconds. Five attempts after the
  // first cover about a minute of queue, which is longer than a class of four
  // hundred takes to drain.
  var RETRY_WAITS = [1500, 3500, 7000, 14000, 25000];

  function newRequestId() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) { /* older phones fall through */ }
    return 'r' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    var outId = form.getAttribute('data-demo');
    var formName = FORM_NAMES[outId];

    /* सबसे काम की संख्या यह नहीं है कि कितने लोग पृष्ठ तक आए, बल्कि यह कि
       कितनों ने भरना शुरू किया और उनमें से कितनों ने पूरा किया। बीच का अंतर
       बताता है कि फ़ॉर्म में कहीं अटकाव है। इसलिए पहली बार छूने पर एक बार
       गिना जाता है, और सफल होने पर दूसरी बार। कोई शब्द नहीं भेजा जाता, केवल
       यह कि कौन-सा फ़ॉर्म था। */
    var chhua = false;
    form.addEventListener('input', function () {
      if (chhua) return;
      chhua = true;
      track('form_shuru', { form: outId });
    }, { once: false });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      var out = document.getElementById(outId);
      var button = form.querySelector('[type="submit"]');

      // Read the name up front: on success the form is reset before the
      // confirmation renders, which would otherwise blank the certificate.
      var naamField = form.querySelector('[name="naam"]');
      var naamValue = naamField ? naamField.value.trim() : '';

      /* गाँव/शहर और उसके साथ जिला, राज्य या देश, जो भी भरा हो। अकेला गाँव
         का नाम अधूरा रहता है : लोडेरा कई हो सकते हैं, और टोरंटो लिखने वाले का
         देश भी दिखना चाहिए। खाली रहे तो पंक्ति छपती ही नहीं। */
      var pick = function (n) {
        var f = form.querySelector('[name="' + n + '"]');
        return f && !f.disabled ? f.value.trim() : '';
      };
      var sthanValue = [pick('gaon'),
                        pick('jila') || pick('rajya') || pick('deshAnya') || pick('desh')]
                       .filter(Boolean).join(', ');

      /* अपना जिला याद रख लीजिए, ताकि जिलेवार सूची में वह पंक्ति अलग दिखे और
         नीचे हो तो अपने आप खुल जाए। यह इसी फ़ोन में रहता है, कहीं भेजा नहीं
         जाता। */
      if (typeof yaadRakho === 'function') yaadRakho(pick('jila'));

      var finish = function (savedMessage, regNo) {
        if (out) {
          var slot = out.querySelector('[data-slot="naam"]');
          if (slot && naamValue) slot.textContent = naamValue;
          out.querySelectorAll('[data-slot="sthan"]').forEach(function (n) {
            n.textContent = sthanValue;
            n.hidden = !sthanValue;
          });
          /* The registration number is the script's to give, not the page's.
             It arrives only when the row was really written, so the line that
             shows it stays hidden otherwise: a certificate carrying a number
             nothing was saved against could not be verified by anyone. */
          // Every copy of it, not the first: the number appears both in the
          // confirmation line and on the certificate itself, and filling only
          // the first left the certificate with its placeholder.
          var regs = out.querySelectorAll('[data-slot="regno"]');
          if (regs.length) {
            if (regNo) regs.forEach(function (n) { n.textContent = regNo; });
            out.querySelectorAll('[data-regno-row]').forEach(function (n) { n.hidden = !regNo; });
          }
          var dateSlot = out.querySelector('[data-slot="date"]');
          if (dateSlot) {
            dateSlot.textContent = new Date().toLocaleDateString('hi-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            });
          }
          out.hidden = false;
          out.setAttribute('tabindex', '-1');
          out.focus();
          out.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setStatus(form, savedMessage, savedMessage ? 'ok' : '');
      };

      // Not a submission form, or no endpoint set yet: confirmation only.
      if (!formName || !ENDPOINT) {
        finish(formName ? 'यह जानकारी अभी सहेजी नहीं गई। फ़ॉर्म सेवा जुड़ते ही सहेजी जाने लगेगी।' : '');
        return;
      }

      if (button) { button.disabled = true; button.dataset.label = button.textContent; }
      setStatus(form, 'भेजा जा रहा है…', 'busy');

      var fileInput = form.querySelector('input[type="file"]');
      var chosen = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files, 0, MAX_FILES) : [];

      // One id for this submission, kept across retries. The script records it
      // and refuses to write the same one twice, so a retry can never turn one
      // person into two rows.
      var reqId = newRequestId();

      Promise.all(chosen.map(shrink)).then(function (files) {
        // A plain-text body keeps this a "simple" request, so the browser
        // sends no CORS preflight, which Apps Script cannot answer.
        var payload = JSON.stringify({
          form: formName,
          reqId: reqId,
          website: (form.querySelector('[name="website"]') || {}).value || '',
          values: collect(form),
          files: files.filter(Boolean)
        });
        return send(payload, 0);
      }).then(function (res) {
        form.reset();
        finish('आपकी जानकारी सुरक्षित रूप से सहेज ली गई है।', res && res.regNo);
        track('form_bhara', { form: outId });
        if (window.LOKSANKALP_REFRESH_STATS) window.LOKSANKALP_REFRESH_STATS();
      }).catch(function (err) {
        setStatus(form, err && err.fatal
          ? 'यह फ़ॉर्म अभी सेवा से जुड़ा नहीं है। कृपया थोड़ी देर बाद प्रयास करें, अथवा info@loksankalp.org पर भेज दें।'
          : err && err.slow
            ? 'इंटरनेट धीमा लग रहा है। कृपया दोबारा भेजें।'
            : 'अभी सहेजा नहीं जा सका। कृपया दोबारा भेजें।', 'error');
      }).then(function () {
        if (button) { button.disabled = false; if (button.dataset.label) button.textContent = button.dataset.label; }
      });

      // When a whole classroom presses "भेजें" at the same moment, the script
      // writes them one at a time and the ones at the back of the queue are
      // turned away. Showing them an error would lose the registration at the
      // exact moment trust is being built, so the page waits and asks again by
      // itself, backing off each time. The waits are jittered so the retries
      // do not all return together and rebuild the same queue.
      function send(payload, attempt) {
        return fetch(ENDPOINT, { method: 'POST', body: payload })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.ok) return res;
            /* The script answering "अज्ञात फ़ॉर्म" means it is running a
               version that predates this form. That is a settled answer, not
               a queue: retrying it five times makes the person wait most of a
               minute to be told the same thing. Fail at once and say what is
               actually wrong. */
            if (res && res.message === 'अज्ञात फ़ॉर्म') throw { fatal: true };
            throw { slow: false };
          })
          .catch(function (err) {
            if (err && err.fatal) throw err;
            if (attempt >= RETRY_WAITS.length) throw (err && err.slow === false ? err : { slow: true });
            var wait = RETRY_WAITS[attempt] + Math.floor(Math.random() * 1200);
            setStatus(form, 'बहुत लोग एक साथ भेज रहे हैं। आपकी जानकारी क़तार में है, पृष्ठ बंद न करें…', 'busy');
            return new Promise(function (go) { setTimeout(go, wait); })
              .then(function () { return send(payload, attempt + 1); });
          });
      }
    });
  });
})();
