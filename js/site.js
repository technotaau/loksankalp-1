/* लोकसंकल्प, progressive enhancement only.
   Everything on the site works with JavaScript disabled. */
(function () {
  'use strict';

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
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = nf.format(target); return; }
    var start = performance.now(), dur = 1400;
    var tick = function (now) {
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

  /* --- संकल्प 21 takes the sticky bar for the length of the campaign -----
     The markup ships with संकल्प लें, the evergreen action, and this swaps it
     while the fast is live. That way it needs no undoing on 3 October, and if
     this file never runs the bar still points somewhere correct. */

  var S21_ENDS = Date.UTC(2026, 9, 2, 18, 30);    // 3 Oct 00:00 IST
  if (Date.now() < S21_ENDS) {
    document.querySelectorAll('[data-s21-swap]').forEach(function (a) {
      var href = a.getAttribute('data-s21-href');
      var label = a.getAttribute('data-s21-label');
      if (!href || !label) return;
      a.setAttribute('href', href);
      // keep the icon, replace only the text node beside it
      Array.prototype.forEach.call(a.childNodes, function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) n.textContent = label;
      });
    });
  }

  /* --- करुणा 21 opens on the night of 20 September -----------------------
     The upload form ships hidden and is revealed at the hour, so nobody sends
     a photograph before the day and nobody has to remember to switch it on.
     Hidden is the safe default: if this file never runs, the page still
     explains what करुणा 21 is and when it opens. */

  var karunaForm = document.querySelector('[data-karuna-form]');
  if (karunaForm) {
    // 20 September 2026, 20:00 IST, written as UTC so a phone set to any
    // timezone opens it at the same moment.
    var KARUNA_OPENS = Date.UTC(2026, 8, 20, 14, 30);
    if (Date.now() >= KARUNA_OPENS) {
      karunaForm.hidden = false;
      var waiting = document.querySelector('[data-karuna-wait]');
      if (waiting) waiting.hidden = true;
      document.querySelectorAll('[data-karuna-count]').forEach(function (n) { n.hidden = false; });
    }
  }

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
    file: 'loksankalp-pramanpatra',
    share: 'मैंने नशामुक्त समाज के लिए लोकसंकल्प लिया है। अब आपकी बारी। loksankalp.org'
  };

  function drawCertificate(naam, tarikh, spec) {
    spec = spec || CERT_DEFAULT;
    var head = '"Tiro Devanagari Hindi", "Noto Sans Devanagari", serif';
    var body = '"Noto Sans Devanagari", system-ui, sans-serif';
    var ready = document.fonts && document.fonts.ready
      ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    return Promise.all([ready, loadSvg('assets/img/logo-mark.svg', 128, 128)])
      .then(function (out) {
        var mark = out[1];
        var c = document.createElement('canvas');
        c.width = CERT_W; c.height = CERT_H;
        var x = c.getContext('2d'), mid = CERT_W / 2;

        var line = function (text, y, font, colour, align) {
          x.font = font; x.fillStyle = colour;
          x.textAlign = align || 'center'; x.textBaseline = 'alphabetic';
          x.fillText(text, mid, y);
        };

        x.fillStyle = '#fffdf5'; x.fillRect(0, 0, CERT_W, CERT_H);

        // tricolour band across the top, the same one the site footer uses
        var bands = ['#e8730c', '#ffffff', '#1b7a34'];
        for (var i = 0; i < 3; i++) {
          x.fillStyle = bands[i];
          x.fillRect(0, i * 5, CERT_W, 5);
        }

        x.strokeStyle = '#17307a';
        x.lineWidth = 6; x.strokeRect(30, 34, CERT_W - 60, CERT_H - 64);
        x.lineWidth = 2; x.strokeRect(46, 50, CERT_W - 92, CERT_H - 96);

        if (mark) x.drawImage(mark, mid - 58, 92, 116, 116);

        line('डिजिटल प्रमाणपत्र', 262, '600 26px ' + body, '#b4560a');
        line(spec.title, 330, '700 56px ' + head, '#17307a');
        line('यह प्रमाणित किया जाता है कि', 412, '400 30px ' + body, '#33405c');

        line(naam, 500, '700 66px ' + head, '#0f5c26');
        var w = Math.min(x.measureText(naam).width + 120, CERT_W - 200);
        x.strokeStyle = '#c9d2e6'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(mid - w / 2, 522); x.lineTo(mid + w / 2, 522); x.stroke();

        line(spec.line, 586, '400 32px ' + body, '#33405c');
        line(spec.motto, 670, '700 36px ' + head, '#b4560a');

        x.strokeStyle = '#e3e8f2'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(mid - 380, 728); x.lineTo(mid + 380, 728); x.stroke();

        line('नशा मुक्त भारत अभियान के अंतर्गत', 774, '400 23px ' + body, '#5a6785');
        line('नई किरण नशा मुक्ति केंद्र, राजकीय डूंगर महाविद्यालय, बीकानेर द्वारा प्रदत्त',
             810, '600 23px ' + body, '#5a6785');
        line('दिनांक ' + tarikh, 866, '400 23px ' + body, '#5a6785');
        line('loksankalp.org', 918, '700 24px ' + body, '#1b7a34');

        return new Promise(function (resolve) {
          c.toBlob(function (b) { resolve(b); }, 'image/png');
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
      line:  d.certLine  || CERT_DEFAULT.line,
      motto: d.certMotto || CERT_DEFAULT.motto,
      file:  d.certFile  || CERT_DEFAULT.file,
      share: d.certShare || CERT_DEFAULT.share
    };

    var dlBtn = scope.querySelector('[data-cert="download"]');
    var shBtn = scope.querySelector('[data-cert="share"]');
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
    var fileName = function () {
      return spec.file + '-' +
        certName().replace(/[^ऀ-ॿ\w]+/g, '-').replace(/^-|-$/g, '') + '.png';
    };

    var build = function () { return drawCertificate(certName(), certDate(), spec); };

    if (dlBtn) dlBtn.addEventListener('click', function () {
      say('प्रमाणपत्र तैयार हो रहा है…');
      build().then(function (blob) {
        if (!blob) { say('प्रमाणपत्र नहीं बन सका। कृपया दोबारा प्रयास करें।'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = fileName();
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        say('प्रमाणपत्र डाउनलोड हो गया।');
      }).catch(function () { say('प्रमाणपत्र नहीं बन सका। कृपया दोबारा प्रयास करें।'); });
    });

    // Sharing the image straight to WhatsApp is what actually spreads this,
    // so the button only appears where the browser can really do it.
    if (shBtn && navigator.canShare) {
      try {
        var probe = new File([new Blob([''], { type: 'image/png' })], 'p.png', { type: 'image/png' });
        if (navigator.canShare({ files: [probe] })) shBtn.hidden = false;
      } catch (e) { /* leave hidden */ }
    }
    if (shBtn) shBtn.addEventListener('click', function () {
      say('प्रमाणपत्र तैयार हो रहा है…');
      build().then(function (blob) {
        var file = new File([blob], fileName(), { type: 'image/png' });
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
      if (animate) runCounter(el); else el.textContent = nf.format(v);
      painted = true;
    });
    if (painted) {
      document.querySelectorAll('[data-stats-note]').forEach(function (n) { n.hidden = true; });
    }
    renderDistricts(stats.byDistrict);
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
    'karuna21-done': 'karuna21'
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

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      var out = document.getElementById(outId);
      var button = form.querySelector('[type="submit"]');

      // Read the name up front: on success the form is reset before the
      // confirmation renders, which would otherwise blank the certificate.
      var naamField = form.querySelector('[name="naam"]');
      var naamValue = naamField ? naamField.value.trim() : '';

      var finish = function (savedMessage) {
        if (out) {
          var slot = out.querySelector('[data-slot="naam"]');
          if (slot && naamValue) slot.textContent = naamValue;
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
      }).then(function () {
        form.reset();
        finish('आपकी जानकारी सुरक्षित रूप से सहेज ली गई है।');
        if (window.LOKSANKALP_REFRESH_STATS) window.LOKSANKALP_REFRESH_STATS();
      }).catch(function (err) {
        setStatus(form, err && err.slow
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
            throw { slow: false };
          })
          .catch(function (err) {
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
