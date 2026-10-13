(function () {
  'use strict';

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Mobile nav toggle */
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Opening hours: highlight today + show today's hours in the info strip.
     Schedule matches the real posted hours (Mon-Sat 10-22, Sun 12-22).
     Uses the visitor's local clock as an approximation of Amsterdam time. */
  var HOURS = {
    0: { open: 12, close: 22 }, // Sunday
    1: { open: 10, close: 22 },
    2: { open: 10, close: 22 },
    3: { open: 10, close: 22 },
    4: { open: 10, close: 22 },
    5: { open: 10, close: 22 },
    6: { open: 10, close: 22 }
  };

  var now = new Date();
  var day = now.getDay();
  var todaySchedule = HOURS[day];

  var todayRow = document.querySelector('.hours-row[data-day="' + day + '"]');
  if (todayRow) todayRow.classList.add('is-today');

  var todayHoursEl = document.getElementById('today-hours');
  if (todayHoursEl && todaySchedule) {
    var hour = now.getHours() + now.getMinutes() / 60;
    var isOpen = hour >= todaySchedule.open && hour < todaySchedule.close;
    var openStr = String(todaySchedule.open).padStart(2, '0') + ':00';
    var closeStr = String(todaySchedule.close).padStart(2, '0') + ':00';
    todayHoursEl.textContent = (isOpen ? 'Open nu' : 'Gesloten') + ' - ' + openStr + ' - ' + closeStr;
  }

  /* Signature scroll reveal: staggered fade/rise, IntersectionObserver-driven.
     Rebuilt from the gsap.com ScrollTrigger technique (see DESIGN-RECON.md).
     Progressive enhancement: content is visible by default (see styles.css).
     Only once the observer is actually attached do we opt into the hidden
     start-state, by adding `js-reveal` on <html>. Respects
     prefers-reduced-motion by never attaching the observer at all, and
     carries a safety timeout in case a viewport never reports intersection
     (e.g. an automated or non-standard rendering context). */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');

  if (!reduceMotion && 'IntersectionObserver' in window && revealEls.length) {
    document.documentElement.classList.add('js-reveal');

    var groups = {};
    revealEls.forEach(function (el) {
      var parentKey = el.parentElement ? el.parentElement.className : 'default';
      groups[parentKey] = groups[parentKey] || [];
      groups[parentKey].push(el);
    });

    var reveal = function (el) { el.classList.add('is-visible'); };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = groups[el.parentElement ? el.parentElement.className : 'default'] || [el];
        var index = siblings.indexOf(el);
        var delay = Math.max(0, index) * 60;
        setTimeout(function () { reveal(el); }, delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

    revealEls.forEach(function (el) { observer.observe(el); });

    /* Safety net: if an element is already in view on load and the
       observer's first callback is ever missed, don't leave it hidden. */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    }, 1200);
  }
})();
