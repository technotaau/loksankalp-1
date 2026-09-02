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

  /* --- Footer year ------------------------------------------------------ */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* --- Demo form handling (no backend yet) ------------------------------ */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = document.getElementById(form.getAttribute('data-demo'));
      if (!out) return;
      var name = (form.querySelector('[name="naam"]') || {}).value || '';
      var nameSlot = out.querySelector('[data-slot="naam"]');
      if (nameSlot && name.trim()) nameSlot.textContent = name.trim();
      out.hidden = false;
      out.setAttribute('tabindex', '-1');
      out.focus();
      out.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
})();
