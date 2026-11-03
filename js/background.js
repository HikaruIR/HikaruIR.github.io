/* ============================================================================
   LOVELY HIKARU — BACKGROUND
   Poster fallback, deferred video loading, cursor spotlight, feature switches.
   Config: SITE.background
   ========================================================================== */
(function () {
  'use strict';

  var HIKARU = (window.HIKARU = window.HIKARU || {});
  var utils = HIKARU.utils || {};
  var site = window.SITE || {};
  var config = site.background || {};

  var root;
  var video;
  var poster;
  var started = false;
  var videoFailed = false;
  var hasPointer = false;

  function prefersReduced() {
    return utils.prefersReducedMotion ? utils.prefersReducedMotion() : false;
  }

  function isImageMode() {
    return config.type === 'image';
  }

  function applyFeatureFlags() {
    var body = document.body;
    body.classList.toggle('no-grain', config.grain === false);
    body.classList.toggle('no-scanlines', config.scanlines === false);
    body.classList.toggle('no-grid', config.grid === false);
    body.classList.toggle('no-spotlight', config.spotlight === false);
  }

  function applyStyleVariables() {
    if (!root) return;
    var overlay = typeof config.overlay === 'number' ? config.overlay : 0.62;
    var focus = typeof config.focusDim === 'number' ? config.focusDim : 0.28;
    root.style.setProperty('--bg-dim', String(utils.clamp ? utils.clamp(overlay, 0, 1) : overlay));
    root.style.setProperty('--focus-dim', String(utils.clamp ? utils.clamp(focus, 0, 0.8) : focus));
    document.documentElement.style.setProperty(
      '--focus-dim',
      String(utils.clamp ? utils.clamp(focus, 0, 0.8) : focus)
    );
  }

  function setPoster() {
    if (!poster) return;
    var image = isImageMode() ? config.src : config.poster || config.fallback;
    if (image) {
      poster.style.backgroundImage = 'url("' + image.replace(/"/g, '\\"') + '")';
    }
    if (config.position) {
      poster.style.backgroundPosition = config.position;
    }
  }

  function showVideo() {
    if (!video) return;
    video.classList.add('is-loaded');
    if (root) root.classList.remove('is-fallback');
  }

  function onVideoError() {
    videoFailed = true;
    if (root) {
      root.classList.add('is-fallback');
      root.classList.add('is-image');
    }
    if (video) {
      video.classList.remove('is-loaded');
      video.style.display = 'none';
    }
  }

  function bindVideo() {
    if (!video || isImageMode()) {
      if (root) root.classList.add('is-image');
      return;
    }

    if (config.position) video.style.objectPosition = config.position;

    utils.on(video, 'loadeddata', showVideo);
    utils.on(video, 'canplay', showVideo);
    utils.on(video, 'playing', showVideo);
    utils.on(video, 'error', onVideoError);

    // metadata only until the visitor presses START
    if (!config.loadAfterStart) {
      loadVideoSource();
    }
  }

  function loadVideoSource() {
    if (!video || videoFailed || !config.src) return;
    if (!video.getAttribute('src')) {
      video.setAttribute('src', config.src);
      video.setAttribute('preload', 'auto');
    }
  }

  function playVideo() {
    if (!video || isImageMode() || videoFailed) return;
    var attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () {
        /* autoplay blocked or interrupted — poster remains visible */
      });
    }
  }

  function bindSpotlight() {
    if (config.spotlight === false || prefersReduced()) return;

    var handleMove = function (event) {
      if (!root) return;
      if (!hasPointer) {
        hasPointer = true;
        document.body.classList.add('has-pointer');
      }
      root.style.setProperty('--spot-x', event.clientX + 'px');
      root.style.setProperty('--spot-y', event.clientY + 'px');
    };

    var throttled = utils.rafThrottle
      ? utils.rafThrottle(function () {
          /* values are written directly in handleMove */
        })
      : null;

    document.addEventListener(
      'pointermove',
      function (event) {
        if (event.pointerType === 'touch') return;
        if (throttled) throttled();
        handleMove(event);
      },
      { passive: true }
    );

    document.addEventListener('pointerleave', function () {
      document.body.classList.remove('has-pointer');
    });
  }

  function bindVisibility() {
    if (!video) return;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (!video.paused) video.pause();
      } else if (started && !prefersReduced() && !videoFailed) {
        playVideo();
      }
    });
  }

  function init() {
    root = utils.qs ? utils.qs('#bg') : document.getElementById('bg');
    video = utils.qs ? utils.qs('#bg-video') : document.getElementById('bg-video');
    poster = utils.qs ? utils.qs('#bg-poster') : document.getElementById('bg-poster');
    if (!root) return;

    applyFeatureFlags();
    applyStyleVariables();
    setPoster();
    bindVideo();
    bindSpotlight();
    bindVisibility();

    if (prefersReduced() && video) {
      video.setAttribute('preload', 'metadata');
    }
  }

  function start() {
    if (started) return;
    started = true;

    if (isImageMode()) {
      if (root) root.classList.add('is-image');
      return;
    }

    if (prefersReduced() || videoFailed) return;

    loadVideoSource();
    playVideo();
  }

  HIKARU.background = {
    init: init,
    start: start
  };
})();
