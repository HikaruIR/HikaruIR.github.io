/* ============================================================================
   LOVELY HIKARU — INTERACTIVE TERMINAL
   ----------------------------------------------------------------------------
   Self-contained terminal layer. Public API: window.HikaruTerminal
     init() · open() · close() · toggle() · isOpen() · print(text, type) · run(cmd)
   Binds #terminal-close, #terminal-scrim, .term-chip[data-cmd] and
   #terminal-input (enter, arrows, tab, ctrl+l, ctrl+c), Escape while open,
   click-to-focus in the terminal body. Opening shortcuts belong to main.js.
   DOM contract: index.html. Styling: css/terminal.css.
   ========================================================================== */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /* ── constants ─────────────────────────────────────────────────────────── */

  var utils = (window.HIKARU && window.HIKARU.utils) || {};
  var SITE_VERSION = '1.0.0';
  var SHELL = 'hikaru-sh ' + SITE_VERSION;
  var KERNEL = 'hikaru-core ' + SITE_VERSION;
  var NODE = 'lovely-hikaru';

  var TYPE_CLASS = {
    input: 'term-line--input', ok: 'term-line--ok', err: 'term-line--err',
    dim: 'term-line--dim', accent: 'term-line--accent', pre: 'term-line--pre',
    gap: 'term-line--gap'
  };

  var HELP_GROUPS = [
    { title: 'PROFILE', names: ['about', 'socials', 'whoami', 'date'] },
    { title: 'MUSIC', names: ['music', 'play', 'pause', 'next', 'prev', 'volume', 'nowplaying'] },
    { title: 'SYSTEM', names: ['clear', 'ls', 'cat', 'neofetch', 'echo', 'history', 'banner', 'open', 'sudo', 'exit', 'help'] }
  ];

  /* ── state ─────────────────────────────────────────────────────────────── */

  var API, commands = {}, refs = {};
  var state = {
    initialized: false, open: false, welcomed: false, session: '',
    history: [], histIndex: 0, draft: '', queue: [], draining: false,
    animToken: 0, pendingClose: false, timers: [],
    startedAt: (window.performance && typeof window.performance.now === 'function') ? window.performance.now() : Date.now()
  };

  /* ── config + tiny helpers ─────────────────────────────────────────────── */

  function site() { return window.SITE || {}; }
  function profile() { var v = site().profile; return v && typeof v === 'object' ? v : {}; }
  function terminalCfg() { var v = site().terminal; return v && typeof v === 'object' ? v : {}; }
  function musicCfg() { var v = site().music; return v && typeof v === 'object' ? v : {}; }
  function uiCfg() { var v = site().ui; return v && typeof v === 'object' ? v : {}; }
  function tracks() { var list = musicCfg().tracks; return Array.isArray(list) ? list : []; }
  function isEnabled() { return terminalCfg().enabled !== false; }
  function byId(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (e) { return []; }
  }
  function on(target, type, handler) {
    if (target && typeof target.addEventListener === 'function') target.addEventListener(type, handler);
  }
  function pad2(value) { return utils.pad2 ? String(utils.pad2(value)) : (value < 10 ? '0' + value : String(value)); }
  function nbsp(count) { return new Array(Math.max(0, count) + 1).join('\u00A0'); }
  function padRight(text, width) { var v = String(text == null ? '' : text); while (v.length < width) v += ' '; return v; }
  function reduced() { return !!(utils.prefersReducedMotion && utils.prefersReducedMotion()); }
  function sleep(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, Math.max(0, ms)); }); }
  function clean(value) {
    var text = String(value == null ? '' : value).trim();
    return (!text || text === '—' || text === '-' || /^loading/i.test(text)) ? '' : text;
  }

  /* lifecycle timers — cancelled whenever open state flips */
  function schedule(fn, ms) {
    var id = window.setTimeout(function () {
      var i = state.timers.indexOf(id);
      if (i >= 0) state.timers.splice(i, 1);
      try { fn(); } catch (e) { /* never break the lifecycle */ }
    }, Math.max(0, ms || 0));
    state.timers.push(id);
  }
  function clearTimers() { while (state.timers.length) window.clearTimeout(state.timers.pop()); }

  /* ── line descriptors ──────────────────────────────────────────────────── */

  function line(text, type) { return { text: text == null ? '' : String(text), type: type || null }; }
  function dim(text) { return line(text, 'dim'); }
  function err(text) { return line(text, 'err'); }
  function ok(text) { return line(text, 'ok'); }
  function parts(list, type) { return { parts: list, type: type || null }; }
  function pause(ms) { return { pause: Math.max(0, ms || 0) }; }
  function isPause(d) { return !!d && typeof d.pause === 'number' && d.text == null && !d.parts; }
  function isTypable(d) {
    if (!d || d.parts || isPause(d)) return false;
    if (d.type === 'gap' || d.type === 'pre' || d.type === 'input') return false;
    var text = d.text == null ? '' : String(d.text);
    return text.length > 0 && text.length < 160;
  }
  function toLines(input) {
    var out = [];
    (function push(item) {
      if (item == null) return;
      if (typeof item === 'string') { out.push(line(item)); return; }
      if (Array.isArray(item)) { item.forEach(push); return; }
      if (typeof item === 'object') out.push(item);
    })(input);
    return out;
  }

  /* ── DOM output ────────────────────────────────────────────────────────── */

  function createLine(d) {
    var node = document.createElement('div');
    var name = 'term-line';
    if (d && d.type && TYPE_CLASS[d.type]) name += ' ' + TYPE_CLASS[d.type];
    node.className = name;
    if (d && d.parts) {
      d.parts.forEach(function (part) {
        if (!part) return;
        var text = part.t == null ? '' : String(part.t);
        if (part.c) {
          var span = document.createElement('span');
          span.className = part.c;
          span.textContent = text;
          node.appendChild(span);
        } else {
          node.appendChild(document.createTextNode(text));
        }
      });
    } else {
      node.textContent = d && d.text != null ? String(d.text) : '';
    }
    return node;
  }

  function markTyped(node) { if (node && node.classList) node.classList.add('is-typed'); }
  function appendNode(d) {
    if (!refs.output) return null;
    var node = createLine(d);
    refs.output.appendChild(node);
    return node;
  }
  function appendStatic(d) { var node = appendNode(d); markTyped(node); return node; }

  function appendEcho(text) {
    if (!refs.output) return;
    var node = document.createElement('div');
    node.className = 'term-line term-line--input';
    var ps1 = document.createElement('span');
    ps1.className = 'term-line__ps1';
    ps1.textContent = promptText();
    var cmd = document.createElement('span');
    cmd.className = 'term-line__cmd';
    cmd.textContent = text;
    node.appendChild(ps1);
    node.appendChild(document.createTextNode(' '));
    node.appendChild(cmd);
    refs.output.appendChild(node);
    markTyped(node);
  }

  var scrollQueued = false;
  function scrollOutput() {
    if (!refs.output || scrollQueued) return;
    scrollQueued = true;
    var run = function () {
      scrollQueued = false;
      var behavior = reduced() ? 'auto' : 'smooth';
      try { refs.output.scrollTo({ top: refs.output.scrollHeight, behavior: behavior }); }
      catch (e) { refs.output.scrollTop = refs.output.scrollHeight; }
      if (refs.body && refs.body.scrollHeight > refs.body.clientHeight) {
        try { refs.body.scrollTo({ top: refs.body.scrollHeight, behavior: behavior }); }
        catch (e) { refs.body.scrollTop = refs.body.scrollHeight; }
      }
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 16);
  }

  /* ── typing + serialised response queue ───────────────────────────────── */

  function typeLine(d, token) {
    var full = d.text == null ? '' : String(d.text);
    var node = createLine({ text: '', type: d.type });
    node.classList.add('is-typing');
    refs.output.appendChild(node);
    markTyped(node);
    scrollOutput();
    var speed = d.speed || Math.min(7, 500 / Math.max(1, full.length));
    var index = 0;
    return new Promise(function (resolve) {
      (function tick() {
        if (token !== state.animToken) {
          node.classList.remove('is-typing');
          if (node.parentNode) node.parentNode.removeChild(node);
          resolve();
          return;
        }
        if (index >= full.length) {
          node.textContent = full;
          node.classList.remove('is-typing');
          markTyped(node);
          scrollOutput();
          resolve();
          return;
        }
        index += 1;
        node.textContent = full.slice(0, index);
        scrollOutput();
        window.setTimeout(tick, speed);
      })();
    });
  }

  function renderLines(input, mode) {
    var lines = toLines(input);
    if (!lines.length) return Promise.resolve();
    if (mode === 'instant' || reduced()) {
      lines.forEach(appendStatic);
      scrollOutput();
      return Promise.resolve();
    }
    var token = state.animToken;

    function typeStep(index) {
      if (token !== state.animToken || index >= lines.length) return Promise.resolve();
      var d = lines[index];
      if (isPause(d)) return sleep(Math.min(d.pause, 1200)).then(function () { return typeStep(index + 1); });
      return typeLine(d, token).then(function () { return typeStep(index + 1); });
    }

    function staggerStep(index) {
      if (token !== state.animToken || index >= lines.length) { scrollOutput(); return Promise.resolve(); }
      var d = lines[index];
      if (isPause(d)) return sleep(Math.min(d.pause, 1200)).then(function () { return staggerStep(index + 1); });
      var node = appendNode(d);
      scrollOutput();
      return sleep(45 + Math.random() * 30).then(function () {
        if (token !== state.animToken) return;
        markTyped(node);
        return sleep(10 + Math.random() * 15).then(function () { return staggerStep(index + 1); });
      });
    }

    if (mode === 'type') return typeStep(0);
    if (lines.length === 1 && isTypable(lines[0])) return typeStep(0);
    return staggerStep(0);
  }

  function drainQueue() {
    if (state.draining) return;
    state.draining = true;

    function pump() {
      if (!state.queue.length) {
        state.draining = false;
        if (state.pendingClose) { state.pendingClose = false; close(); }
        return;
      }
      var job = state.queue.shift();
      if (job.token !== state.animToken) { pump(); return; }
      var work;
      try {
        if (job.echo) { appendEcho(job.echo); scrollOutput(); }
        var result = typeof job.lines === 'function' ? job.lines() : job.lines;
        work = Promise.resolve(result).then(function (resolved) {
          if (job.token !== state.animToken) return;
          return renderLines(resolved, job.mode || 'auto');
        });
      } catch (e) {
        work = renderLines(err('internal: ' + ((e && e.message) || e)), 'instant');
      }
      work.then(pump, pump);
    }

    pump();
  }

  function enqueue(job) {
    job.token = state.animToken;
    state.queue.push(job);
    drainQueue();
  }

  function clearOutput() {
    state.animToken += 1;
    state.queue.length = 0;
    if (refs.output) while (refs.output.firstChild) refs.output.removeChild(refs.output.firstChild);
    scrollOutput();
  }

  /* ── prompt, session, focus ────────────────────────────────────────────── */

  function promptText() {
    return (terminalCfg().user || 'hikaru') + '@' + (terminalCfg().host || 'lovely') + ':' + (terminalCfg().cwd || '~') + '$';
  }
  function syncPromptLabel() {
    var label = byId('terminal-ps1');
    if (!label) return;
    var map = { '.ps1__user': terminalCfg().user || 'hikaru', '.ps1__host': terminalCfg().host || 'lovely', '.ps1__path': terminalCfg().cwd || '~' };
    Object.keys(map).forEach(function (selector) {
      var node = label.querySelector(selector);
      if (node) node.textContent = map[selector];
    });
  }
  function makeSession() {
    var store = utils.store || null;
    var saved = null;
    try { if (store && typeof store.get === 'function') saved = store.get('hikaru.terminal.session', null); }
    catch (e) { saved = null; }
    if (typeof saved === 'string' && /^0x[0-9a-f]{4,8}$/.test(saved)) return saved;
    var alphabet = '0123456789abcdef';
    var token = '0x';
    for (var i = 0; i < 4; i++) token += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    try { if (store && typeof store.set === 'function') store.set('hikaru.terminal.session', token); }
    catch (e) { /* memory-only session */ }
    return token;
  }
  function focusInput() {
    if (!refs.input) return;
    try { refs.input.focus({ preventScroll: true }); }
    catch (e) { try { refs.input.focus(); } catch (e2) { /* ignore */ } }
  }

  /* ── open / close lifecycle ────────────────────────────────────────────── */

  function playWelcome() {
    var configured = terminalCfg().welcome;
    var values = (Array.isArray(configured) ? configured : []).filter(function (item) { return typeof item === 'string' && item; });
    if (!values.length) values = ['HIKARU shell v' + SITE_VERSION + ' — type help to get started.'];
    enqueue({ echo: null, lines: values.map(function (text) { return { text: text, speed: 8 }; }), mode: 'type' });
    enqueue({ echo: null, mode: 'auto', lines: [parts([
      { t: 'session ready — ', c: 'dim' }, { t: 'type help', c: 'accent' },
      { t: ' or press ', c: 'dim' }, { t: 'tab', c: 'accent' }, { t: ' · ↑/↓ for history.', c: 'dim' }
    ])] });
  }

  function open() {
    if (!state.initialized) init();
    if (!isEnabled()) {
      if (window.console && typeof window.console.info === 'function') window.console.info('[terminal] disabled — SITE.terminal.enabled is false');
      return false;
    }
    if (!refs.layer) return false;
    if (state.open) { focusInput(); return true; }

    clearTimers();
    state.open = true;
    refs.layer.hidden = false;
    refs.layer.setAttribute('aria-hidden', 'false');
    if (refs.toggle) refs.toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('terminal-open');
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { refs.layer.classList.add('is-open'); });
    else refs.layer.classList.add('is-open');

    if (!state.welcomed) { state.welcomed = true; playWelcome(); }
    schedule(focusInput, reduced() ? 0 : 120);
    return true;
  }

  function close() {
    if (!state.initialized || !refs.layer || !state.open) return false;
    clearTimers();
    state.open = false;
    refs.layer.classList.remove('is-open');
    document.body.classList.remove('terminal-open');
    if (refs.toggle) refs.toggle.setAttribute('aria-expanded', 'false');
    schedule(function () {
      if (state.open) return;
      refs.layer.hidden = true;
      refs.layer.setAttribute('aria-hidden', 'true');
    }, reduced() ? 0 : 220);
    if (refs.toggle && typeof refs.toggle.focus === 'function') {
      try { refs.toggle.focus({ preventScroll: true }); }
      catch (e) { try { refs.toggle.focus(); } catch (e2) { /* ignore */ } }
    }
    return true;
  }

  function toggle() { if (state.open) { close(); return false; } return open(); }
  function isOpen() { return !!state.open; }

  /* ── time / system info ────────────────────────────────────────────────── */

  function zoneOffset(zone, date) {
    if (zone) {
      try {
        var name = '';
        new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(date).forEach(function (part) {
          if (part.type === 'timeZoneName') name = part.value;
        });
        var match = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
        if (match) return match[1] + pad2(Number(match[2])) + ':' + (match[3] || '00');
        if (name === 'GMT') return '+00:00';
      } catch (e) { /* fall back to the visitor offset */ }
    }
    var offset = -date.getTimezoneOffset();
    var absolute = Math.abs(offset);
    return (offset >= 0 ? '+' : '-') + pad2(Math.floor(absolute / 60)) + ':' + pad2(absolute % 60);
  }

  function uptime() {
    var now = (window.performance && typeof window.performance.now === 'function') ? window.performance.now() : Date.now();
    var total = Math.max(0, Math.floor((now - state.startedAt) / 1000));
    return pad2(Math.floor(total / 3600)) + ':' + pad2(Math.floor((total % 3600) / 60)) + ':' + pad2(total % 60);
  }

  function platformLabel() {
    var data = navigator.userAgentData;
    if (data && data.platform) return String(data.platform);
    var platform = navigator.platform || '';
    if (/Win/i.test(platform)) return 'Windows';
    if (/Mac/i.test(platform)) return 'macOS';
    if (/Linux|X11/i.test(platform)) return 'Linux';
    if (/iPhone|iPad|iPod/i.test(platform)) return 'iOS';
    if (/Android/i.test(platform)) return 'Android';
    return platform || 'unknown';
  }
  function browserLabel() {
    var ua = navigator.userAgent || '', m;
    if ((m = /Edg\/([\d.]+)/.exec(ua))) return 'Edge ' + m[1].split('.')[0];
    if ((m = /OPR\/([\d.]+)/.exec(ua))) return 'Opera ' + m[1].split('.')[0];
    if ((m = /Firefox\/([\d.]+)/.exec(ua))) return 'Firefox ' + m[1].split('.')[0];
    if ((m = /Chrome\/([\d.]+)/.exec(ua))) return 'Chrome ' + m[1].split('.')[0];
    if ((m = /Version\/([\d.]+).*Safari/.exec(ua))) return 'Safari ' + m[1].split('.')[0];
    return 'browser';
  }
  function localeLabel() {
    try { return new Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || 'en-US'; }
    catch (e) { return navigator.language || 'en-US'; }
  }
  function resolutionLabel() {
    return ((window.screen && window.screen.width) || window.innerWidth || 0) + 'x' + ((window.screen && window.screen.height) || window.innerHeight || 0);
  }

  function dateLines() {
    var now = new Date();
    var use24 = uiCfg().clock24h !== false;
    var options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    var locale = use24 ? 'en-GB' : 'en-US';
    if (use24) options.hourCycle = 'h23'; else options.hour12 = true;
    var zone = profile().timezone && profile().timezone !== 'auto' ? String(profile().timezone) : null;
    if (zone) options.timeZone = zone;

    var formatted;
    try { formatted = new Intl.DateTimeFormat(locale, options).formatToParts(now); }
    catch (e) {
      delete options.timeZone;
      try { formatted = new Intl.DateTimeFormat(locale, options).formatToParts(now); }
      catch (e2) { return [err(now.toString())]; }
    }
    var map = {};
    formatted.forEach(function (part) { if (part.type && part.type !== 'literal') map[part.type] = part.value; });
    var text = (map.weekday || '') + ' · ' + (map.day || '--') + ' ' + (map.month || '---') + ' ' + (map.year || '----') +
      ' · ' + (map.hour || '--') + ':' + (map.minute || '--') + ':' + (map.second || '--');
    if (!use24 && map.dayPeriod) text += ' ' + map.dayPeriod;
    text += ' (' + zoneOffset(zone, now) + ')';

    return [
      line(text),
      parts([{ t: 'node: ', c: 'dim' }, { t: NODE }, { t: ' · uptime: ', c: 'dim' }, { t: uptime() }])
    ];
  }

  /* ── player adapter (window.HikaruPlayer, guarded) ───────────────────────── */

  function playerApi() {
    var player = window.HikaruPlayer;
    if (!player || typeof player !== 'object') return null;
    var methods = ['play', 'pause', 'next', 'prev', 'setVolume', 'getState'];
    for (var i = 0; i < methods.length; i++) if (typeof player[methods[i]] === 'function') return player;
    return null;
  }
  function playerCall(names, value) {
    var player = playerApi();
    if (!player) return false;
    for (var i = 0; i < names.length; i++) {
      if (typeof player[names[i]] === 'function') {
        try { player[names[i]](value); return true; } catch (e) { return false; }
      }
    }
    return false;
  }
  function click(id) {
    var button = byId(id);
    if (!button || button.disabled || typeof button.click !== 'function') return false;
    try { button.click(); return true; } catch (e) { return false; }
  }
  function sourceIndex(audio, list) {
    var source = audio.currentSrc || audio.getAttribute('src') || '';
    if (!source) return -1;
    var file = source.split('/').pop().split('?')[0];
    for (var i = 0; i < list.length; i++) {
      var candidate = list[i] && list[i].src ? String(list[i].src).split('/').pop() : '';
      if (candidate && candidate === file) return i;
    }
    return -1;
  }

  function playerState() {
    var list = tracks();
    var player = playerApi();
    var audio = byId('audio');
    var titleEl = byId('player-title');
    var artistEl = byId('player-artist');
    var toggleEl = byId('player-toggle');
    var volumeEl = byId('player-volume');

    var raw = {};
    if (player) {
      try { raw = (typeof player.getState === 'function' && player.getState()) || {}; }
      catch (e) { raw = {}; }
    }

    var st = {
      tracks: list, available: false, playing: false, index: -1, title: '', artist: '', error: raw.error || null,
      volume: (typeof musicCfg().volume === 'number') ? musicCfg().volume : 0.65
    };

    var index = typeof raw.index === 'number' ? raw.index : -1;
    if (index >= 0 && index < list.length) st.index = index;
    else if (audio) st.index = sourceIndex(audio, list);

    if (typeof raw.volume === 'number' && isFinite(raw.volume)) st.volume = raw.volume > 1 ? raw.volume / 100 : raw.volume;
    else if (volumeEl && volumeEl.value !== '' && !isNaN(Number(volumeEl.value))) st.volume = Number(volumeEl.value) / 100;
    st.volume = Math.max(0, Math.min(1, st.volume));

    var track = st.index >= 0 ? list[st.index] : null;
    var rawTrack = raw.track && typeof raw.track === 'object' ? raw.track : null;
    st.title = (rawTrack && rawTrack.title) || (track && track.title) || clean(titleEl && titleEl.textContent);
    st.artist = (rawTrack && rawTrack.artist) || (track && track.artist) || clean(artistEl && artistEl.textContent);

    if (typeof raw.playing === 'boolean') st.playing = raw.playing;
    else if (typeof raw.paused === 'boolean') st.playing = !raw.paused;
    else if (audio && (audio.currentSrc || audio.getAttribute('src'))) st.playing = !audio.paused && !audio.ended;
    else if (toggleEl) st.playing = String(toggleEl.getAttribute('data-state') || '').toLowerCase() === 'playing';

    var enabled = musicCfg().enabled !== false;
    var sourced = !!(audio && (audio.currentSrc || audio.getAttribute('src')));
    st.available = enabled && list.length > 0 && (player ? (raw.ready !== false || sourced || !!st.title) : (sourced || !!st.title));
    if (st.error) st.available = false;
    if (!st.available) st.playing = false;
    return st;
  }

  function playerErrorText(st) {
    if (!st.error) return '';
    return String(st.error.message || st.error.code || 'unknown media error');
  }

  function nowPlayingLine(st, prefix) {
    var label = prefix === 'now' ? 'now playing: ' : prefix + ': ';
    if (!st.title) return parts([{ t: label, c: 'dim' }, { t: st.available ? '—' : 'offline', c: 'dim' }]);
    var list = [{ t: label, c: 'dim' }, { t: st.title, c: 'accent' }];
    if (st.artist) list.push({ t: ' — ' + st.artist, c: 'dim' });
    if (st.index >= 0 && st.tracks.length) list.push({ t: ' · ' + pad2(st.index + 1) + '/' + pad2(st.tracks.length), c: 'dim' });
    return parts(list);
  }

  function stateLine(st) {
    return parts([
      { t: 'state: ', c: 'dim' }, { t: st.available ? (st.playing ? 'playing' : 'paused') : 'offline' },
      { t: ' · volume: ', c: 'dim' }, { t: Math.round(st.volume * 100) + '%' },
      { t: ' · source: ', c: 'dim' }, { t: 'local' }
    ]);
  }

  function trackLines(st) {
    var list = st && st.tracks ? st.tracks : tracks();
    if (!list.length) return [dim('playlist: empty.')];
    var current = st && st.index >= 0 ? st.index : -1;
    return list.map(function (track, index) {
      var active = index === current;
      var row = [{ t: active ? '>' : ' ', c: 'accent' }, { t: ' ' + pad2(index + 1) + nbsp(2) }];
      row.push({ t: String(track.title || 'untitled'), c: active ? 'accent' : null });
      if (track.artist) row.push({ t: ' — ' + String(track.artist), c: 'dim' });
      return parts(row);
    });
  }

  function musicOverview() {
    var st = playerState();
    var lines = [];
    if (st.error) lines.push(err('music: ' + playerErrorText(st)));
    else if (!st.available) lines.push(err('music: audio offline — initialise the player first.'));
    lines.push(nowPlayingLine(st, 'now'), stateLine(st));
    var list = trackLines(st);
    if (list.length) lines.push(line('', 'gap'), list);
    return lines;
  }

  function musicNow() { var st = playerState(); return [nowPlayingLine(st, 'now'), stateLine(st)]; }

  function volumeAction(st, rawValue) {
    var value = String(rawValue == null ? '' : rawValue).trim();
    if (!value) return [parts([{ t: 'volume: ', c: 'dim' }, { t: Math.round(st.volume * 100) + '%', c: 'accent' }])];
    if (!st.available) return [err('volume: audio offline — initialise the player first.')];
    var number = parseFloat(value.replace('%', ''));
    if (!isFinite(number) || number < 0 || number > 100) {
      return [err('volume: expected a number between 0 and 100'), dim('usage: volume <0–100>')];
    }
    var level = Math.round(number);
    if (!playerCall(['setVolume'], level / 100)) {
      var audio = byId('audio');
      if (audio) { try { audio.volume = level / 100; } catch (e) { /* ignore */ } }
      var slider = byId('player-volume');
      if (slider) slider.value = String(level);
    }
    return [parts([{ t: 'volume: ', c: 'dim' }, { t: level + '%', c: 'accent' }])];
  }

  function reportAction(action) {
    var st = playerState();
    if (action === 'play') return st.playing ? [nowPlayingLine(st, 'playing')] : [err('play: playback did not start — autoplay may be blocked.')];
    if (action === 'pause') return [dim('playback paused.')];
    if (action === 'next') return [nowPlayingLine(st, 'next')];
    return [nowPlayingLine(st, 'previous')];
  }

  function musicAction(action) {
    var st = playerState();
    if (action === 'vol') return volumeAction(st, arguments[1]);
    if (!st.available) return [err(action + ': audio offline — initialise the player first.')];

    if (action === 'play') {
      if (st.playing) return [dim('already playing.')];
      var player = playerApi();
      var pending = null;
      if (player && typeof player.play === 'function') {
        try { pending = player.play(); } catch (e) { pending = null; }
      } else if (!click('player-toggle')) {
        var audio = byId('audio');
        if (audio && typeof audio.play === 'function') { try { pending = audio.play(); } catch (e) { pending = null; } }
      }
      return Promise.resolve(pending).then(function (started) {
        if (started === false) return [err('play: playback did not start — autoplay may be blocked.')];
        return sleep(120).then(function () { return reportAction('play'); });
      }, function () {
        return [err('play: playback did not start — autoplay may be blocked.')];
      });
    }
    if (action === 'pause') {
      if (!st.playing) return [dim('already paused.')];
      if (!playerCall(['pause'])) {
        if (!click('player-toggle')) {
          var audioPause = byId('audio');
          if (audioPause && typeof audioPause.pause === 'function') { try { audioPause.pause(); } catch (e) { /* ignore */ } }
        }
      }
    } else if (action === 'next') {
      if (!playerCall(['next', 'skipNext'])) click('player-next');
    } else if (action === 'prev') {
      if (!playerCall(['prev', 'previous', 'skipPrev'])) click('player-prev');
    }
    return sleep(140).then(function () { return reportAction(action); });
  }

  /* ── command helpers ───────────────────────────────────────────────────── */

  function allNames() { return Object.keys(commands); }

  function levenshtein(a, b) {
    var left = String(a), right = String(b), previous = [], current = [], i, j;
    if (!left.length) return right.length;
    if (!right.length) return left.length;
    for (j = 0; j <= right.length; j++) previous[j] = j;
    for (i = 1; i <= left.length; i++) {
      current[0] = i;
      for (j = 1; j <= right.length; j++) {
        var cost = left.charAt(i - 1) === right.charAt(j - 1) ? 0 : 1;
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      }
      for (j = 0; j <= right.length; j++) previous[j] = current[j];
    }
    return previous[right.length];
  }

  function nearest(name) {
    var best = null, bestDistance = 99;
    allNames().forEach(function (candidate) {
      if (Math.abs(candidate.length - name.length) > 3) return;
      var distance = levenshtein(name, candidate);
      if (distance < bestDistance) { bestDistance = distance; best = candidate; }
    });
    return bestDistance <= (name.length <= 3 ? 1 : 2) ? best : null;
  }

  function unknownLines(name) {
    var lines = [err('command not found: ' + name)];
    var suggestion = nearest(name);
    if (suggestion) lines.push(parts([{ t: 'did you mean ', c: 'dim' }, { t: '"' + suggestion + '"', c: 'accent' }, { t: '?', c: 'dim' }]));
    lines.push(dim('type help to list commands.'));
    return lines;
  }

  function socialList() { var list = site().socials; return Array.isArray(list) ? list : []; }

  function findSocial(query) {
    var needle = String(query || '').toLowerCase();
    var match = null;
    socialList().forEach(function (social) {
      if (match) return;
      [social.id, social.icon, social.label, social.handle, social.url].forEach(function (candidate) {
        if (match) return;
        var value = candidate ? String(candidate).toLowerCase() : '';
        if (value && (value === needle || value.indexOf(needle) === 0)) match = social;
      });
    });
    return match;
  }

  function socialLines() {
    var list = socialList();
    if (!list.length) return [dim('no socials configured.')];
    var labelWidth = 8, handleWidth = 6;
    list.forEach(function (social) {
      labelWidth = Math.max(labelWidth, String(social.label || social.id || '').length);
      handleWidth = Math.max(handleWidth, String(social.handle || '').length);
    });
    return list.map(function (social) {
      var label = String(social.label || social.id || 'link');
      var handle = String(social.handle || '');
      return parts([
        { t: label, c: 'accent' }, { t: nbsp(labelWidth - label.length + 2) },
        { t: handle }, { t: nbsp(handleWidth - handle.length + 2) },
        { t: String(social.url || ''), c: 'dim' }
      ]);
    });
  }

  function openExternal(url) {
    try {
      if (typeof window.open === 'function') { window.open(url, '_blank', 'noopener,noreferrer'); return true; }
    } catch (e) { /* fall through */ }
    try {
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    } catch (e2) { return false; }
  }

  function normalizeUrl(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return null;
    if (/^https?:\/\//i.test(text)) {
      try { return new window.URL(text).href; } catch (e) { return null; }
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return null;
    if (!/\s/.test(text) && /^[\w.-]+\.[a-z]{2,}(?:[\/?#]\S*)?$/i.test(text)) {
      try { return new window.URL('https://' + text).href; } catch (e) { return null; }
    }
    return null;
  }

  function hikaruMark() {
    return [
      ' _   _  ___  _  __    _     ____   _   _ ',
      '| | | ||_ _|| |/ /   / \\   |  _ \\ | | | |',
      '| |_| | | | | \' /   / _ \\  | |_) || | | |',
      '|  _  | | | | . \\  / ___ \\ |  _ < | |_| |',
      '|_| |_||___||_|\\_\\/_/   \\_\\|_| \\_\\ \\___/ '
    ];
  }

  /* ── commands ──────────────────────────────────────────────────────────── */

  function cmdHelp() {
    var groups = [];
    HELP_GROUPS.forEach(function (group) {
      var names = group.names.filter(function (name) { return !!commands[name]; });
      if (names.length) groups.push({ title: group.title, names: names });
    });
    var custom = allNames().filter(function (name) { return commands[name].group === 'CUSTOM'; });
    if (custom.length) groups.push({ title: 'CUSTOM', names: custom });

    var width = 10;
    groups.forEach(function (group) {
      group.names.forEach(function (name) { width = Math.max(width, name.length); });
    });
    width += 2;

    var lines = [];
    groups.forEach(function (group, groupIndex) {
      if (groupIndex > 0) lines.push(line('', 'gap'));
      lines.push(parts([{ t: group.title, c: 'accent' }]));
      group.names.forEach(function (name) {
        lines.push(parts([
          { t: '  ' }, { t: name, c: 'accent' },
          { t: nbsp(width - name.length) },
          { t: (commands[name] || {}).desc || '', c: 'dim' }
        ]));
      });
    });
    lines.push(line('', 'gap'));
    lines.push(parts([
      { t: 'tab', c: 'accent' }, { t: ' completes · ', c: 'dim' },
      { t: '↑/↓', c: 'accent' }, { t: ' history · ', c: 'dim' },
      { t: 'ctrl+l', c: 'accent' }, { t: ' clears', c: 'dim' }
    ]));
    return lines;
  }

  function cmdAbout() {
    var data = profile();
    var about = (Array.isArray(data.about) ? data.about : []).filter(function (item) { return typeof item === 'string' && item; });
    var lines = about.map(function (item) { return line(item); });
    if (!lines.length) lines.push(dim('no profile data available.'));
    var alias = (site().meta && site().meta.brand) || 'Lovely Hikaru';
    lines.push(line('', 'gap'));
    lines.push(parts([
      { t: 'name: ', c: 'dim' }, { t: data.username || 'HIKARU', c: 'accent' },
      { t: ' · alias: ', c: 'dim' }, { t: alias },
      { t: ' · location: ', c: 'dim' }, { t: data.location || 'unknown' },
      { t: ' · tags: ', c: 'dim' }, { t: Array.isArray(data.tags) ? data.tags.join(', ') || '—' : '—' }
    ]));
    return lines;
  }

  function cmdSocials(rest) {
    var query = String(rest || '').trim();
    if (!query) {
      var lines = socialLines();
      lines.push(line('', 'gap'));
      lines.push(parts([{ t: 'socials ', c: 'dim' }, { t: '<id>', c: 'accent' }, { t: ' opens a profile in a new tab.', c: 'dim' }]));
      return lines;
    }
    var social = findSocial(query);
    if (!social) {
      var known = socialList().map(function (item) { return String(item.id || item.label || '').toLowerCase(); }).filter(Boolean);
      return [err('socials: unknown profile "' + query + '"'), dim(known.length ? 'known: ' + known.join(' · ') : 'no socials configured.')];
    }
    if (!social.url) return [err('socials: that profile has no url configured.')];
    if (!openExternal(String(social.url))) return [err('socials: could not open a new tab.')];
    return [parts([{ t: 'opening ', c: 'dim' }, { t: String(social.url), c: 'accent' }, { t: ' …', c: 'dim' }])];
  }

  function cmdWhoami() {
    var now = new Date();
    var time = '';
    try {
      time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
    } catch (e) { time = now.toTimeString().slice(0, 8); }
    var zone = '';
    try { zone = new Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { zone = ''; }
    return [
      parts([{ t: 'visitor', c: 'accent' }, { t: ' — read-only guest' }]),
      parts([{ t: 'session: ', c: 'dim' }, { t: state.session }]),
      parts([{ t: 'platform: ', c: 'dim' }, { t: platformLabel() + ' · lang: ' + (navigator.language || 'en-US') }]),
      parts([{ t: 'local time: ', c: 'dim' }, { t: time + (zone ? ' (' + zone + ')' : '') }]),
      parts([{ t: 'authenticated: ', c: 'dim' }, { t: 'false', c: 'err' }])
    ];
  }

  function cmdMusic(rest) {
    var pieces = rest ? String(rest).split(/\s+/) : [];
    var sub = pieces.length ? pieces[0].toLowerCase() : '';
    var args = pieces.slice(1);
    if (!sub) return musicOverview();
    if (sub === 'play' || sub === 'resume') return musicAction('play');
    if (sub === 'pause') return musicAction('pause');
    if (sub === 'next' || sub === 'skip') return musicAction('next');
    if (sub === 'prev' || sub === 'previous' || sub === 'back') return musicAction('prev');
    if (sub === 'vol' || sub === 'volume') return volumeAction(playerState(), args.join(' '));
    if (sub === 'list' || sub === 'ls' || sub === 'playlist') return trackLines(playerState());
    if (sub === 'now' || sub === 'nowplaying' || sub === 'current') return musicNow();
    return [err('music: unknown argument "' + sub + '"'), dim('usage: music [play|pause|next|prev|vol N|list|now]')];
  }

  function cmdLs() {
    var rows = [
      { perms: '-rw-r--r--', size: '1.2K', name: 'about.md', dir: false },
      { perms: '-rw-r--r--', size: '640B', name: 'socials.txt', dir: false },
      { perms: 'drwxr-xr-x', size: '4.0K', name: 'playlist/', dir: true },
      { perms: 'drwx------', size: '???', name: '.secrets/', dir: true },
      { perms: '-r--------', size: '0B', name: 'target.lock', dir: false }
    ];
    return [dim('total 5')].concat(rows.map(function (row) {
      return parts([
        { t: padRight(row.perms, 12), c: 'dim' }, { t: padRight('hikaru', 8), c: 'dim' },
        { t: padRight(row.size, 6), c: 'dim' }, { t: row.name, c: row.dir ? 'accent' : null }
      ], 'pre');
    }));
  }

  function cmdCat(rest) {
    var file = String(rest || '').trim().toLowerCase();
    if (!file) return [err('cat: missing operand'), dim('usage: cat <about.md|socials.txt|playlist|target.lock>')];
    if (file === 'about.md' || file === 'about') return cmdAbout();
    if (file === 'socials.txt' || file === 'socials') return socialLines();
    if (file === 'playlist' || file === 'playlist/') return trackLines(playerState());
    if (file === 'target.lock') {
      return [
        err('cat: target.lock: Permission denied'),
        dim('target.lock — owner: hikaru · mode 0400 · immutable'),
        line('  "eyes on my target. nothing else leaves this node."')
      ];
    }
    if (file === '.secrets' || file === '.secrets/') {
      return [err('cat: .secrets: Permission denied'), dim('nothing here you could read anyway.')];
    }
    return [err('cat: ' + String(rest).trim() + ': No such file or directory')];
  }

  function cmdNeofetch() {
    var mark = hikaruMark();
    var info = [
      { label: 'OS', value: platformLabel() + ' · ' + browserLabel() },
      { label: 'Host', value: NODE + '.local' },
      { label: 'Kernel', value: KERNEL },
      { label: 'Uptime', value: uptime() },
      { label: 'Shell', value: SHELL },
      { label: 'Terminal', value: 'tty 01' },
      { label: 'Resolution', value: resolutionLabel() },
      { label: 'Locale', value: localeLabel() },
      { label: 'Theme', value: 'void-green' }
    ];
    var width = 0;
    mark.forEach(function (row) { width = Math.max(width, row.length); });
    width += 2;
    var lines = [];
    for (var i = 0; i < Math.max(mark.length, info.length); i++) {
      var row = [];
      if (i < mark.length) row.push({ t: padRight(mark[i], width), c: 'accent' });
      else row.push({ t: nbsp(width) });
      if (i < info.length) {
        row.push({ t: padRight(info[i].label + ':', 11), c: 'accent' });
        row.push({ t: info[i].value });
      }
      lines.push(parts(row, 'pre'));
    }
    return lines;
  }

  function cmdEcho(rest) { return [rest ? line(String(rest)) : line('', 'gap')]; }

  function cmdHistory() {
    if (!state.history.length) return [dim('history: empty.')];
    var recent = state.history.slice(-20);
    var first = state.history.length - recent.length + 1;
    return recent.map(function (command, index) {
      var number = String(first + index);
      return parts([{ t: nbsp(4 - number.length) + number + '  ', c: 'dim' }, { t: command }]);
    });
  }

  function cmdBanner() {
    var lines = hikaruMark().map(function (row) { return parts([{ t: row, c: 'accent' }], 'pre'); });
    lines.push(line('', 'gap'));
    lines.push(parts([
      { t: promptText(), c: 'dim' }, { t: ' ' }, { t: '>_', c: 'accent' },
      { t: ' ' + SHELL + ' · ' + (tracks().length ? tracks().length + ' tracks' : 'no tracks'), c: 'dim' }
    ]));
    return lines;
  }

  function cmdOpen(rest) {
    var target = String(rest || '').trim();
    if (!target) return [err('open: missing url'), dim('usage: open <url|github|telegram|discord>')];
    var social = findSocial(target);
    var url = social && social.url ? String(social.url) : normalizeUrl(target);
    if (!url) return [err('open: not a valid url: ' + target), dim('usage: open <https://…|github|telegram|discord>')];
    if (!openExternal(url)) return [err('open: could not open a new tab.')];
    return [parts([{ t: 'opening ', c: 'dim' }, { t: url, c: 'accent' }, { t: ' …', c: 'dim' }])];
  }

  function cmdSudo() {
    return [dim('[sudo] password for guest: '), pause(480), err('guest is not in the sudoers file. This incident has been reported.')];
  }

  function cmdExit() {
    state.pendingClose = true;
    return [dim('logout'), dim('session closed — connection to tty 01 terminated.')];
  }

  function cmdPlay() { return musicAction('play'); }
  function cmdPause() { return musicAction('pause'); }
  function cmdNext() { return musicAction('next'); }
  function cmdPrev() { return musicAction('prev'); }
  function cmdVolume(rest) { return volumeAction(playerState(), rest); }
  function cmdNowPlaying() { return musicNow(); }

  /* ── command registry ──────────────────────────────────────────────────── */

  function define(name, group, description, run) {
    commands[name] = { group: group, desc: description, run: run };
  }

  function registerCommands() {
    commands = {};
    define('about', 'PROFILE', 'read the operator profile', cmdAbout);
    define('socials', 'PROFILE', 'list profiles · <id> opens', cmdSocials);
    define('whoami', 'PROFILE', 'session identity', cmdWhoami);
    define('date', 'PROFILE', 'site time + local uptime', dateLines);

    define('music', 'MUSIC', 'player status and tracklist', cmdMusic);
    define('play', 'MUSIC', 'resume playback', cmdPlay);
    define('pause', 'MUSIC', 'pause playback', cmdPause);
    define('next', 'MUSIC', 'advance one track', cmdNext);
    define('prev', 'MUSIC', 'previous track', cmdPrev);
    define('volume', 'MUSIC', 'volume <0–100>', cmdVolume);
    define('nowplaying', 'MUSIC', 'current track', cmdNowPlaying);

    define('clear', 'SYSTEM', 'wipe the screen', function () { return []; });
    define('ls', 'SYSTEM', 'list ~ contents', cmdLs);
    define('cat', 'SYSTEM', 'cat <file>', cmdCat);
    define('neofetch', 'SYSTEM', 'system summary', cmdNeofetch);
    define('echo', 'SYSTEM', 'echo <text>', cmdEcho);
    define('history', 'SYSTEM', 'last 20 inputs', cmdHistory);
    define('banner', 'SYSTEM', 'print the mark', cmdBanner);
    define('open', 'SYSTEM', 'open <url|social>', cmdOpen);
    define('sudo', 'SYSTEM', 'elevate (denied)', cmdSudo);
    define('exit', 'SYSTEM', 'close the session', cmdExit);
    define('quit', 'SYSTEM', 'alias of exit', cmdExit);
    define('help', 'SYSTEM', 'this list', cmdHelp);

    var custom = terminalCfg().customCommands;
    if (custom && typeof custom === 'object') {
      Object.keys(custom).forEach(function (name) {
        if (!name || /\s/.test(name)) return;
        var raw = custom[name];
        var output = (Array.isArray(raw) ? raw : [raw]).filter(function (item) { return item != null; }).map(function (item) { return line(String(item)); });
        define(name.toLowerCase(), 'CUSTOM', 'custom command', function () { return output.slice(); });
      });
    }
  }

  /* ── input ─────────────────────────────────────────────────────────────── */

  function parse(text) {
    var match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(String(text == null ? '' : text).trim());
    return match ? { name: match[1].toLowerCase(), rest: match[2] ? match[2].trim() : '' } : { name: '', rest: '' };
  }

  function exec(parsed) {
    var entry = commands[parsed.name];
    if (!entry) return unknownLines(parsed.name);
    try {
      var result = entry.run(parsed.rest);
      return result == null ? [] : result;
    } catch (error) {
      return [err('error: ' + ((error && error.message) || String(error)))];
    }
  }

  function addHistory(command) {
    if (!command) return;
    if (state.history[state.history.length - 1] !== command) {
      state.history.push(command);
      if (state.history.length > 100) state.history.shift();
    }
    state.histIndex = state.history.length;
  }

  function setInput(value) {
    if (!refs.input) return;
    refs.input.value = value;
    try { refs.input.setSelectionRange(value.length, value.length); } catch (e) { /* ignore */ }
  }

  function executeLine(value) {
    addHistory(value);
    var parsed = parse(value);
    if (parsed.name === 'clear') { clearOutput(); return; }
    enqueue({ echo: value, lines: exec(parsed), mode: 'auto' });
  }

  function submitInput() {
    if (!refs.input) return;
    var text = String(refs.input.value || '').trim();
    refs.input.value = '';
    state.histIndex = state.history.length;
    state.draft = '';
    if (!text) { enqueue({ echo: null, lines: [line('', 'gap')], mode: 'instant' }); return; }
    executeLine(text);
  }

  function historyPrev() {
    if (!state.history.length || !refs.input) return;
    if (state.histIndex >= state.history.length) state.draft = refs.input.value;
    if (state.histIndex > 0) state.histIndex -= 1;
    setInput(state.history[state.histIndex]);
  }

  function historyNext() {
    if (state.histIndex >= state.history.length) return;
    state.histIndex += 1;
    if (state.histIndex >= state.history.length) {
      state.histIndex = state.history.length;
      setInput(state.draft || '');
      return;
    }
    setInput(state.history[state.histIndex]);
  }

  function completeInput() {
    if (!refs.input) return;
    var prefix = String(refs.input.value || '').trim().toLowerCase();
    if (!prefix || /\s/.test(prefix)) return;
    var matches = allNames().sort().filter(function (name) { return name.indexOf(prefix) === 0; });
    if (!matches.length) { enqueue({ echo: null, lines: [dim('no completions for "' + prefix + '"')], mode: 'instant' }); return; }
    if (matches.length === 1) { setInput(matches[0] + ' '); return; }
    var width = 0;
    matches.forEach(function (name) { width = Math.max(width, name.length); });
    width += 2;
    var lines = [];
    for (var i = 0; i < matches.length; i += 6) {
      var row = '';
      for (var j = i; j < Math.min(i + 6, matches.length); j++) row += matches[j] + nbsp(width - matches[j].length);
      lines.push(parts([{ t: row.replace(/\u00A0+$/, ''), c: 'dim' }]));
    }
    enqueue({ echo: null, lines: lines, mode: 'instant' });
  }

  function onInputKeydown(event) {
    var key = event.key;
    if (key === 'Enter') { event.preventDefault(); submitInput(); return; }
    if (key === 'ArrowUp') { event.preventDefault(); historyPrev(); return; }
    if (key === 'ArrowDown') { event.preventDefault(); historyNext(); return; }
    if (key === 'Tab') { event.preventDefault(); completeInput(); return; }
    if (!(event.ctrlKey || event.metaKey)) return;
    var letter = String(key).toLowerCase();
    if (letter === 'l' && !event.shiftKey && !event.altKey) { event.preventDefault(); clearOutput(); return; }
    if (letter === 'c' && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      enqueue({ echo: null, lines: [dim('^C')], mode: 'instant' });
      if (refs.input) refs.input.value = '';
      state.histIndex = state.history.length;
      state.draft = '';
      focusInput();
    }
  }

  function onBodyClick(event) {
    var target = event.target;
    if (target && typeof target.closest === 'function' && target.closest('a, button, input, label, .term-line')) return;
    var selection = null;
    try { selection = window.getSelection ? window.getSelection() : null; } catch (e) { selection = null; }
    if (selection && String(selection).length > 0) return;
    focusInput();
  }

  function run(command) {
    if (!state.initialized) init();
    if (!isEnabled()) return false;
    var text = String(command == null ? '' : command).replace(/[\r\n]+/g, ' ').trim();
    if (!text) return false;
    if (!state.open) open();
    if (!state.open) return false;
    executeLine(text);
    return true;
  }

  function print(text, type) {
    if (!state.initialized) init();
    var values = Array.isArray(text) ? text : [text];
    var lines = values.map(function (item) {
      if (item == null) return line('', type || null);
      if (typeof item === 'string') return line(item, type || null);
      return item;
    });
    enqueue({ echo: null, lines: lines, mode: 'instant' });
  }

  /* ── init / API ────────────────────────────────────────────────────────── */

  function collectRefs() {
    refs.layer = byId('terminal-layer');
    refs.scrim = byId('terminal-scrim');
    refs.closeBtn = byId('terminal-close');
    refs.body = byId('terminal-body');
    refs.banner = byId('terminal-banner');
    refs.output = byId('terminal-output');
    refs.promptline = byId('terminal-promptline');
    refs.ps1 = byId('terminal-ps1');
    refs.input = byId('terminal-input');
    refs.hints = byId('terminal-hints');
    refs.session = byId('terminal-session');
    refs.toggle = byId('terminal-toggle');
  }

  function bindEvents() {
    on(refs.closeBtn, 'click', function () { close(); });
    on(refs.scrim, 'click', function () { close(); });
    on(refs.input, 'keydown', onInputKeydown);
    on(refs.body, 'click', onBodyClick);
    qsa('.term-chip[data-cmd]', refs.layer || document).forEach(function (chip) {
      on(chip, 'click', function () {
        var command = chip.getAttribute('data-cmd');
        if (command) run(command);
        focusInput();
      });
    });
    on(document, 'keydown', function (event) {
      if (event.key === 'Escape' && state.open) { event.preventDefault(); close(); }
    });
  }

  function init() {
    if (state.initialized) return API;
    collectRefs();
    if (!refs.layer || !refs.input || !refs.output) return API;

    state.initialized = true;
    refs.layer.setAttribute('aria-hidden', 'true');
    if (refs.layer.hidden !== true) refs.layer.hidden = true;
    document.body.classList.remove('terminal-open');
    state.session = makeSession();
    if (refs.session) refs.session.textContent = state.session;
    syncPromptLabel();
    registerCommands();
    bindEvents();
    return API;
  }

  API = {
    init: init,
    open: open,
    close: close,
    toggle: toggle,
    isOpen: isOpen,
    print: print,
    run: run
  };
  window.HikaruTerminal = API;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
