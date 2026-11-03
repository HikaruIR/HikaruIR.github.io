/* ============================================================================
   LOVELY HIKARU — shared helpers
   Exposed as window.HIKARU.utils. Loaded before every other module.
   ========================================================================== */
(function () {
  'use strict';

  var HIKARU = (window.HIKARU = window.HIKARU || {});

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function on(target, type, handler, options) {
    if (target && target.addEventListener) target.addEventListener(type, handler, options);
    return handler;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    var total = Math.floor(seconds);
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    if (mins >= 60) {
      var hours = Math.floor(mins / 60);
      return hours + ':' + pad2(mins % 60) + ':' + pad2(secs);
    }
    return mins + ':' + pad2(secs);
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function isTouch() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, wait) {
    var timer = 0;
    return function () {
      var args = arguments;
      var self = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function storeGet(key, fallback) {
    try {
      var raw = window.sessionStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function storeSet(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* storage unavailable — ignore */
    }
  }

  function storeRemove(key) {
    try { window.sessionStorage.removeItem(key); } catch (error) { /* ignore */ }
  }

  HIKARU.utils = {
    qs: qs,
    qsa: qsa,
    on: on,
    clamp: clamp,
    randInt: randInt,
    pad2: pad2,
    formatTime: formatTime,
    prefersReducedMotion: prefersReducedMotion,
    isTouch: isTouch,
    escapeHtml: escapeHtml,
    debounce: debounce,
    rafThrottle: rafThrottle,
    wait: wait,
    store: {
      get: storeGet,
      set: storeSet,
      remove: storeRemove
    }
  };

  HIKARU.config = window.SITE || {};
})();
