/* ============================================================================
   LOVELY HIKARU — APP WIRING
   Boot → site transition, top bar controls, keyboard shortcuts, player sync.
   ========================================================================== */
(function () {
  'use strict';

  var HIKARU = (window.HIKARU = window.HIKARU || {});
  var utils = HIKARU.utils || {};
  var site = window.SITE || {};

  var started = false;
  var soundBtn;
  var terminalBtn;
  var playerEl;

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(fn, label) {
    return function () {
      try {
        return fn.apply(null, arguments);
      } catch (error) {
        if (window.console && console.warn) console.warn('[hikaru:' + label + ']', error);
      }
    };
  }

  function syncSoundButton(state) {
    if (!soundBtn || !state) return;
    var muted = !!state.muted || state.volume === 0;
    soundBtn.classList.toggle('is-muted', muted);
    soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
    soundBtn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
  }

  function startExperience() {
    if (started) return;
    started = true;

    document.body.classList.remove('is-booting');
    document.body.classList.add('is-ready');

    if (HIKARU.background && HIKARU.background.start) {
      safe(HIKARU.background.start, 'background:start')();
    }

    var music = site.music || {};
    if (music.enabled !== false && music.autoplayOnStart !== false && window.HikaruPlayer) {
      window.setTimeout(
        safe(function () {
          window.HikaruPlayer.play();
        }, 'player:autoplay'),
        420
      );
    }
  }

  function wireTopbar() {
    soundBtn = byId('sound-toggle');
    terminalBtn = byId('terminal-toggle');
    playerEl = byId('player');

    if (soundBtn) {
      utils.on(soundBtn, 'click', safe(function () {
        if (window.HikaruPlayer && window.HikaruPlayer.toggleMute) {
          window.HikaruPlayer.toggleMute();
        }
      }, 'mute-toggle'));
    }

    if (terminalBtn) {
      if (!site.terminal || site.terminal.enabled === false) {
        terminalBtn.hidden = true;
      } else {
        utils.on(terminalBtn, 'click', safe(function () {
          if (window.HikaruTerminal) window.HikaruTerminal.toggle();
        }, 'terminal-toggle'));
      }
    }

    if (window.HikaruPlayer && window.HikaruPlayer.getState) {
      var state = window.HikaruPlayer.getState();
      if (state) syncSoundButton(state);
    }

    if (window.HikaruTerminal && window.HikaruTerminal.setEnabled === false) {
      /* nothing to do — API is guarded above */
    }
  }

  function wireKeys() {
    if (site.ui && site.ui.shortcuts === false) return;

    utils.on(document, 'keydown', safe(function (event) {
      var target = event.target || {};
      var tag = target.tagName;
      var typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;

      if (event.key === 'Escape') {
        if (window.HikaruTerminal && window.HikaruTerminal.isOpen && window.HikaruTerminal.isOpen()) {
          event.preventDefault();
          window.HikaruTerminal.close();
        }
        return;
      }

      if (typing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!document.body.classList.contains('is-ready')) return;

      if (event.key === '~' || event.key === '`' || event.key === '/') {
        if (window.HikaruTerminal) {
          event.preventDefault();
          window.HikaruTerminal.open();
        }
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        if (tag === 'BUTTON' || tag === 'A') return;
        if (window.HikaruTerminal && window.HikaruTerminal.isOpen && window.HikaruTerminal.isOpen()) return;
        if (window.HikaruPlayer) {
          event.preventDefault();
          window.HikaruPlayer.toggle();
        }
      }
    }, 'keys'));
  }

  function wireEvents() {
    utils.on(document, 'hikaru:start', safe(startExperience, 'start'));

    utils.on(document, 'hikaru:player:state', safe(function (event) {
      syncSoundButton(event.detail);
    }, 'player-state'));

    utils.on(document, 'hikaru:player:error', safe(function (event) {
      var detail = event.detail || {};
      if (detail.message && window.console && console.info) {
        console.info('[hikaru:audio]', detail.message);
      }
    }, 'player-error'));
  }

  function applyUiFlags() {
    var ui = site.ui || {};
    var background = site.background || {};

    if (ui.crt === false) {
      document.body.classList.add('no-scanlines');
      document.body.classList.add('no-grain');
    }
    if (ui.showColophon === false) {
      var colophon = document.querySelector('.colophon');
      if (colophon) colophon.hidden = true;
    }
    if (!background.spotlight) {
      document.body.classList.add('no-spotlight');
    }
  }

  function init() {
    document.documentElement.classList.add('js');
    applyUiFlags();

    try {
      if (HIKARU.background && HIKARU.background.init) HIKARU.background.init();
    } catch (error) {
      if (window.console) console.warn('[hikaru:background]', error);
    }

    wireTopbar();
    wireKeys();
    wireEvents();

    // if boot was already skipped/hidden before this module loaded
    if (!byId('boot') || (byId('boot') && byId('boot').hidden)) {
      startExperience();
    }

    HIKARU.app = {
      version: '1.0.0',
      start: startExperience
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
