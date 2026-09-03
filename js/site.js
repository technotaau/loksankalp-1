/* लोकसंकल्प — progressive enhancement only.
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
        if (el.hasAttribute('data-count')) runCounter(el);
        else el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    counters.forEach(function (el) { io.observe(el); });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    counters.forEach(runCounter);
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- Live figures ----------------------------------------------------
     Counters start at 0 in the HTML and are raised once the real numbers
     arrive from the Sheet. If the request fails they simply stay at 0 rather
     than showing anything invented. */

  var statEls = document.querySelectorAll('[data-stat]');
  if (statEls.length && (window.LOKSANKALP_FORM_ENDPOINT || '').trim()) {
    fetch((window.LOKSANKALP_FORM_ENDPOINT || '').trim() + '?stats=1')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.stats) return;
        Array.prototype.forEach.call(statEls, function (el) {
          var v = res.stats[el.getAttribute('data-stat')];
          if (typeof v !== 'number') return;
          el.setAttribute('data-count', String(v));
          runCounter(el);
        });
        document.querySelectorAll('[data-stats-note]').forEach(function (n) { n.hidden = true; });
        renderDistricts(res.stats.byDistrict);
      })
      .catch(function () { /* leave the zeros in place */ });
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
     first — this is what makes photo upload usable at all here. */
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
          out.hidden = false;
          out.setAttribute('tabindex', '-1');
          out.focus();
          out.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setStatus(form, savedMessage, savedMessage ? 'ok' : '');
      };

      // Not a submission form, or no endpoint set yet: confirmation only.
      if (!formName || !ENDPOINT) {
        finish(formName ? 'यह जानकारी अभी सहेजी नहीं गई — फ़ॉर्म सेवा जुड़ते ही सहेजी जाने लगेगी।' : '');
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
          // sends no CORS preflight — Apps Script cannot answer one.
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
