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

  function drawCertificate(naam, tarikh) {
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
        line('लोकसंकल्प प्रमाणपत्र', 330, '700 56px ' + head, '#17307a');
        line('यह प्रमाणित किया जाता है कि', 412, '400 30px ' + body, '#33405c');

        line(naam, 500, '700 66px ' + head, '#0f5c26');
        var w = Math.min(x.measureText(naam).width + 120, CERT_W - 200);
        x.strokeStyle = '#c9d2e6'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(mid - w / 2, 522); x.lineTo(mid + w / 2, 522); x.stroke();

        line('ने नशामुक्त समाज के निर्माण हेतु लोकसंकल्प लिया।', 586, '400 32px ' + body, '#33405c');
        line('“नशे को नहीं, संस्कारों को सामाजिक स्वीकृति”', 670, '700 36px ' + head, '#b4560a');

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

  var certBox = document.getElementById('cert');
  if (certBox) {
    var dlBtn = document.querySelector('[data-cert="download"]');
    var shBtn = document.querySelector('[data-cert="share"]');
    var certMsg = document.querySelector('[data-cert="status"]');
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
      return 'loksankalp-pramanpatra-' +
        certName().replace(/[^ऀ-ॿ\w]+/g, '-').replace(/^-|-$/g, '') + '.png';
    };

    var build = function () { return drawCertificate(certName(), certDate()); };

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
        return navigator.share({
          files: [file],
          title: 'लोकसंकल्प प्रमाणपत्र',
          text: 'मैंने नशामुक्त समाज के लिए लोकसंकल्प लिया है। अब आपकी बारी। loksankalp.org'
        });
      }).then(function () { say(''); })
        .catch(function () { say('साझा नहीं हो सका। आप प्रमाणपत्र डाउनलोड करके भेज सकते हैं।'); });
    });
  }

  /* --- Live figures ----------------------------------------------------
     Counters start at 0 in the HTML and are raised once the real numbers
     arrive from the Sheet. If the request fails they simply stay at 0 rather
     than showing anything invented. */

  var statEls = document.querySelectorAll('[data-stat]');
  var CACHE_KEY = 'ls-stats-v1';
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
      if (typeof v !== 'number') return;
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
    'samman-done': 'samman'
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

      Promise.all(chosen.map(shrink)).then(function (files) {
        return fetch(ENDPOINT, {
          method: 'POST',
          // A plain-text body keeps this a "simple" request, so the browser
          // sends no CORS preflight, which Apps Script cannot answer.
          body: JSON.stringify({
            form: formName,
            website: (form.querySelector('[name="website"]') || {}).value || '',
            values: collect(form),
            files: files.filter(Boolean)
          })
        });
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res && res.ok) {
          form.reset();
          finish('आपकी जानकारी सुरक्षित रूप से सहेज ली गई है।');
        } else {
          setStatus(form, 'सहेजने में समस्या हुई। कृपया दोबारा भेजें।', 'error');
        }
      }).catch(function () {
        setStatus(form, 'इंटरनेट धीमा लग रहा है। कृपया दोबारा भेजें।', 'error');
      }).then(function () {
        if (button) { button.disabled = false; if (button.dataset.label) button.textContent = button.dataset.label; }
      });
    });
  });
})();
