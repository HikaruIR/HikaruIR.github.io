/* ============================================================================
   HIKARU — BOOT SEQUENCE + FULL-SCREEN TERMINAL GATE
   Types the init log, then hands the visitor a real prompt.
   Typing "start" (or pressing the [ start ] button) opens the profile.
   Config: SITE.boot (+ SITE.boot.gate), SITE.profile, SITE.terminal
   ========================================================================== */
(function () {
  'use strict';

  var HIKARU = (window.HIKARU = window.HIKARU || {});
  var utils = HIKARU.utils || {};
  var site = window.SITE || {};
  var config = site.boot || {};
  var profile = site.profile || {};
  var terminalCfg = site.terminal || {};

  var root;
  var logEl;
  var gateEl;
  var gateOut;
  var gateInput;
  var gateGo;
  var clockEl;
  var platformEl;

  var started = false;
  var ready = false;
  var cancelled = false;
  var waiting = false;
  var clockTimer = 0;
  var timers = [];

  function reduced() {
    return utils.prefersReducedMotion ? utils.prefersReducedMotion() : false;
  }

  function touch() {
    return utils.isTouch ? utils.isTouch() : false;
  }

  function gateConfig() {
    return config.gate || {};
  }

  function openCommands() {
    var commands = gateConfig().openCommands;
    if (!Array.isArray(commands) || !commands.length) {
      commands = ['start', 'open', 'enter', 'profile', 'go'];
    }
    return commands.map(function (item) {
      return String(item).toLowerCase();
    });
  }

  function promptText() {
    var user = String(terminalCfg.user || 'hikaru');
    var host = String(terminalCfg.host || 'lovely');
    var cwd = String(terminalCfg.cwd || '~');
    return user + '@' + host + ':' + cwd + '$';
  }

  function schedule(fn, delay) {
    var id = window.setTimeout(function () {
      if (cancelled) return;
      fn();
    }, delay);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) {
      window.clearTimeout(id);
    });
    timers = [];
  }

  function elapsedStamp() {
    var seconds = (window.performance && performance.now ? performance.now() : Date.now()) / 1000;
    return '[ ' + String(seconds.toFixed(3)).padStart(7, '0') + ' ]';
  }

  function makeLine(line) {
    var row = document.createElement('div');
    row.className = 'boot__line';

    var stamp = document.createElement('span');
    stamp.className = 'boot__stamp';
    stamp.textContent = elapsedStamp();

    var text = document.createElement('span');
    text.className = 'boot__text';

    var tag = document.createElement('span');
    tag.className = 'boot__tag';
    tag.textContent = line.tag || 'ok';
    if (/fail|error|warn|skip/i.test(String(line.tag || ''))) {
      tag.classList.add('is-dim');
    }

    row.appendChild(stamp);
    row.appendChild(text);
    row.appendChild(tag);
    logEl.appendChild(row);

    return { row: row, text: text };
  }

  function typeText(element, value, speed) {
    return new Promise(function (resolve) {
      var full = String(value == null ? '' : value);
      if (reduced() || !speed || speed <= 0 || full.length === 0) {
        element.textContent = full;
        resolve();
        return;
      }

      var index = 0;
      (function step() {
        if (cancelled || started) {
          element.textContent = full;
          resolve();
          return;
        }
        index += 1;
        element.textContent = full.slice(0, index);
        if (index >= full.length) {
          resolve();
          return;
        }
        schedule(step, speed);
      })();
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      schedule(resolve, ms);
    });
  }

  function readyLine() {
    var row = document.createElement('div');
    row.className = 'boot__line is-ready';
    var stamp = document.createElement('span');
    stamp.className = 'boot__stamp';
    stamp.textContent = elapsedStamp();
    var text = document.createElement('span');
    text.className = 'boot__text';
    text.textContent = config.ready || 'system ready — awaiting input';
    row.appendChild(stamp);
    row.appendChild(text);
    logEl.appendChild(row);
    return row;
  }

  /* ------------------------------------------------------------------ */
  /* Gate output                                                         */
  /* ------------------------------------------------------------------ */
  function gatePrint(text, tone) {
    if (!gateOut) return;
    var row = document.createElement('div');
    row.className = 'boot__gate-line' + (tone ? ' is-' + tone : '');
    row.textContent = text;
    gateOut.appendChild(row);
    while (gateOut.children.length > 9) gateOut.removeChild(gateOut.firstChild);
    gateOut.scrollTop = gateOut.scrollHeight;
  }

  function gatePrintList(lines, tone) {
    lines.forEach(function (text) {
      gatePrint(text, tone);
    });
  }

  function revealGate(focus) {
    if (ready) return;
    ready = true;
    if (gateEl) gateEl.hidden = false;
    if (gateOut) {
      gatePrint(
        gateConfig().hint || 'type start + enter to open the profile',
        'dim'
      );
    }
    if (focus && gateConfig().autoFocus !== false && !touch() && gateInput) {
      try {
        gateInput.focus({ preventScroll: true });
      } catch (error) {
        gateInput.focus();
      }
    }
  }

  function gateHelp() {
    var lines = [
      'available commands:',
      '  start    open the profile',
      '  about    read the operator profile',
      '  socials  list social profiles',
      '  whoami   session identity',
      '  date     node time',
      '  music    audio status',
      '  clear    reset this prompt'
    ];
    return lines;
  }

  function gateDate() {
    var zone = profile.timezone && profile.timezone !== 'auto' ? profile.timezone : undefined;
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (part) {
        map[part.type] = part.value;
      });
      return (
        map.weekday + ' · ' + map.day + ' ' + map.month + ' ' + map.year +
        ' · ' + map.hour + ':' + map.minute + ':' + map.second
      );
    } catch (error) {
      return new Date().toString();
    }
  }

  function gateExecute(raw) {
    if (!gateInput) return;
    var value = String(raw == null ? '' : raw).trim();
    gateInput.value = '';

    if (!value) {
      gatePrint('type "start" to open the profile.', 'dim');
      return;
    }

    var command = value.toLowerCase();
    gatePrint(promptText() + ' ' + value, 'input');

    if (openCommands().indexOf(command) !== -1) {
      if (waiting) return;
      waiting = true;
      gateInput.disabled = true;
      gatePrint('opening profile …', 'ok');
      schedule(function () {
        engage();
      }, reduced() ? 40 : 320);
      return;
    }

    if (command === 'help' || command === '?') {
      gatePrintList(gateHelp(), 'accent');
      return;
    }

    if (command === 'about') {
      var about = Array.isArray(profile.about) ? profile.about : [];
      if (!about.length) {
        gatePrint('no profile data available.', 'dim');
      } else {
        gatePrintList(about);
      }
      gatePrint('type "start" when ready.', 'dim');
      return;
    }

    if (command === 'socials') {
      var socials = Array.isArray(site.socials) ? site.socials : [];
      if (!socials.length) {
        gatePrint('no socials configured.', 'dim');
        return;
      }
      socials.forEach(function (social) {
        gatePrint(
          '  ' + String(social.label || social.id || 'link').toLowerCase() +
            ' — ' + String(social.url || '—')
        );
      });
      return;
    }

    if (command === 'whoami') {
      gatePrint('visitor — read-only guest');
      gatePrint('authenticated: false');
      return;
    }

    if (command === 'date') {
      gatePrint(gateDate());
      return;
    }

    if (command === 'music') {
      var tracks = (site.music && Array.isArray(site.music.tracks)) ? site.music.tracks : [];
      gatePrint(
        tracks.length
          ? tracks.length + ' tracks queued — audio starts with the profile.'
          : 'audio offline.'
      );
      return;
    }

    if (command === 'clear' || command === 'cls') {
      if (gateOut) gateOut.textContent = '';
      return;
    }

    gatePrint('command not found: ' + value, 'err');
    gatePrint('type "start" to open the profile, or "help".', 'dim');
  }

  function bindGate() {
    if (!gateInput) return;

    utils.on(gateInput, 'keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        gateExecute(gateInput.value);
      }
    });

    utils.on(gateGo, 'click', function (event) {
      event.preventDefault();
      engage();
    });

    var promptLine = gateEl ? gateEl.querySelector('.boot__promptline') : null;
    utils.on(promptLine, 'click', function (event) {
      if (event.target === gateInput) return;
      gateInput.focus();
    });

    utils.on(document, 'keydown', function (event) {
      if (started || !ready || waiting) return;
      if (event.key !== 'Enter') return;
      var tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      engage();
    });
  }

  function appendAllInstant() {
    var lines = config.lines || [];
    lines.forEach(function (line) {
      var made = makeLine(line);
      made.text.textContent = line.text || '';
    });
    readyLine();
    revealGate(false);
  }

  async function runSequence() {
    var lines = config.lines || [];
    var speed = typeof config.typeSpeed === 'number' ? config.typeSpeed : 12;
    var delay = typeof config.lineDelay === 'number' ? config.lineDelay : 120;

    await wait(220);

    for (var index = 0; index < lines.length; index += 1) {
      if (cancelled || started) return;
      var line = lines[index] || {};
      var made = makeLine(line);
      await typeText(made.text, line.text || '', speed);
      if (cancelled || started) return;
      await wait(delay);
    }

    if (cancelled || started) return;
    readyLine();
    await wait(260);
    if (cancelled || started) return;
    revealGate(true);
  }

  function engage() {
    if (started) return;
    started = true;
    cancelled = true;
    clearTimers();
    ready = true;

    document.dispatchEvent(
      new CustomEvent('hikaru:start', {
        bubbles: true,
        detail: { skipped: skipRequested() }
      })
    );

    document.body.classList.remove('is-booting');
    document.body.classList.add('has-started');
    if (root) {
      root.classList.add('is-done');
      root.setAttribute('aria-hidden', 'true');
      window.setTimeout(function () {
        if (root && root.classList.contains('is-done')) root.hidden = true;
      }, 1000);
    }
    if (clockTimer) window.clearInterval(clockTimer);
  }

  function skipRequested() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('skipboot') === '1' || params.get('skipboot') === 'true';
    } catch (error) {
      return false;
    }
  }

  function updateClock() {
    if (!clockEl) return;
    var timeZone = profile.timezone && profile.timezone !== 'auto' ? profile.timezone : undefined;
    try {
      var formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      });
      clockEl.textContent = formatter.format(new Date());
    } catch (error) {
      clockEl.textContent = new Date().toLocaleTimeString('en-GB');
    }
  }

  function init() {
    root = utils.qs ? utils.qs('#boot') : document.getElementById('boot');
    if (!root) return;

    logEl = utils.qs ? utils.qs('#boot-log') : document.getElementById('boot-log');
    gateEl = utils.qs ? utils.qs('#boot-gate') : document.getElementById('boot-gate');
    gateOut = utils.qs ? utils.qs('#boot-gate-output') : document.getElementById('boot-gate-output');
    gateInput = utils.qs ? utils.qs('#boot-input') : document.getElementById('boot-input');
    gateGo = utils.qs ? utils.qs('#boot-go') : document.getElementById('boot-go');
    clockEl = utils.qs ? utils.qs('#boot-clock') : document.getElementById('boot-clock');
    platformEl = utils.qs ? utils.qs('#boot-platform') : document.getElementById('boot-platform');

    document.body.classList.add('is-booting');

    if (platformEl) {
      var platform = 'WEB';
      try {
        platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'WEB';
      } catch (error) {
        platform = 'WEB';
      }
      platformEl.textContent = String(platform).toUpperCase();
    }

    bindGate();
    updateClock();
    clockTimer = window.setInterval(updateClock, 1000);

    var skip = skipRequested() && config.allowSkip !== false;

    if (skip) {
      appendAllInstant();
      schedule(function () {
        engage();
      }, 420);
      return;
    }

    if (reduced()) {
      appendAllInstant();
      return;
    }

    runSequence();
  }

  HIKARU.boot = {
    init: init,
    engage: engage,
    isReady: function () {
      return ready;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
