/* ============================================================================
   LOVELY HIKARU — MUSIC PLAYER ENGINE
   Contract : index.html (#player + #playlist), window.SITE.music (js/config.js),
              window.HIKARU.utils (js/utils.js). Exposes window.HikaruPlayer.
   Events   : document CustomEvents (bubbles) —
              hikaru:player:ready | track | state | error | blocked
   ========================================================================== */
(function () {
  'use strict';

  /* 01 — DEPENDENCIES (utils, with local fallbacks) */
  var U = (window.HIKARU && window.HIKARU.utils) || {};
  var qs = U.qs || function (s, r) { return (r || document).querySelector(s); };
  var on = U.on || function (t, tp, fn, o) { if (t && t.addEventListener) t.addEventListener(tp, fn, o); return fn; };
  var clamp = U.clamp || function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var randInt = U.randInt || function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  var pad2 = U.pad2 || function (v) { return v < 10 ? '0' + v : String(v); };
  var formatTime = U.formatTime || function (s) {
    if (!isFinite(s) || s < 0) return '0:00';
    var total = Math.floor(s);
    return Math.floor(total / 60) + ':' + pad2(total % 60);
  };
  var prefersReducedMotion = U.prefersReducedMotion || function () { return false; };
  var storeGet = (U.store && U.store.get) || function (k, fb) {
    try { var raw = window.sessionStorage.getItem(k); return raw === null ? fb : JSON.parse(raw); } catch (e) { return fb; }
  };
  var storeSet = (U.store && U.store.set) || function (k, v) {
    try { window.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
  };

  /* 02 — CONSTANTS + STATE */
  var FADE_MS = 900, SKIP_DELAY = 1200, CLOSE_MS = 200, VOLUME_KEY = 'hikaru:volume';
  var cfg = {}, el = {}, tracks = [], nodes = [];
  var state = { ready: false, index: 0, total: 0, track: null, error: null };
  var initialized = false, disabled = false, allFailed = false, streak = 0, errorHandled = false;
  var volumeTarget = 0.65, durationSec = 0, wantPlay = false, scrubbing = false, playToken = 0;
  var fadeDone = false, fading = false, fadeRaf = 0, skipTimer = 0, skipResume = false;
  var playlistOpen = false, playlistTimer = 0, mediaBound = false;

  /* 03 — HELPERS */
  function readConfig() { return (window.SITE && window.SITE.music) || {}; }
  function copyTrack(track) {
    return track ? { id: track.id, title: track.title, artist: track.artist, src: track.src, cover: track.cover } : null;
  }
  function dispatch(name, detail) {
    var payload = detail || {}, evt;
    try { evt = new CustomEvent(name, { detail: payload, bubbles: true }); }
    catch (e) { evt = document.createEvent('CustomEvent'); evt.initCustomEvent(name, true, false, payload); }
    document.dispatchEvent(evt);
  }
  function getState() {
    var a = el.audio;
    return {
      ready: !!state.ready, playing: a ? !a.paused : false, muted: a ? !!a.muted : false,
      volume: volumeTarget, index: state.total ? state.index : -1, total: state.total,
      track: copyTrack(state.track), duration: durationSec,
      currentTime: a && isFinite(a.currentTime) ? a.currentTime : 0,
      error: state.error ? { code: state.error.code, message: state.error.message } : null
    };
  }
  function dispatchState() { dispatch('hikaru:player:state', getState()); }
  function trackPayload() { return { index: state.index, total: state.total, track: copyTrack(state.track) }; }
  function setText(node, value) { if (node) node.textContent = value == null ? '' : String(value); }
  function setFlag(node, name, active) {
    if (node && node.classList) { if (active) node.classList.add(name); else node.classList.remove(name); }
  }
  function toUnit(value) { var n = Number(value); return isFinite(n) ? clamp(n, 0, 1) : null; }

  /* 04 — VOLUME + MUTE */
  function resolveVolume() {
    var value = typeof cfg.volume === 'number' && isFinite(cfg.volume) ? clamp(cfg.volume, 0, 1) : 0.65;
    var saved = cfg.rememberVolume ? storeGet(VOLUME_KEY, null) : null;
    return typeof saved === 'number' && isFinite(saved) && saved >= 0 && saved <= 1 ? saved : value;
  }
  function updateVolumeUI() {
    var pct = Math.round(volumeTarget * 100);
    if (el.volume) el.volume.value = String(pct);
    setText(el.volumeLabel, String(pct));
  }
  function cancelFade() {
    if (fadeRaf) window.cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
    if (fading) { fading = false; if (el.audio) el.audio.volume = volumeTarget; }
  }
  function applyVolume(value, persist) {
    cancelFade();
    volumeTarget = clamp(value, 0, 1);
    if (el.audio) el.audio.volume = volumeTarget;
    updateVolumeUI();
    if (persist && cfg.rememberVolume) storeSet(VOLUME_KEY, volumeTarget);
  }
  function setVolume(value) {
    var next = toUnit(value);
    if (next === null) return;
    fadeDone = true; /* manual changes win over the intro fade */
    applyVolume(next, true);
    dispatchState();
  }
  function getVolume() { return volumeTarget; }
  function setMuted(value) {
    if (!el.audio) return;
    var muted = !!value;
    el.audio.muted = muted;
    setFlag(el.mute, 'is-muted', muted);
    if (el.mute) {
      el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
      el.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    }
    dispatchState();
  }
  function toggleMute() { if (el.audio) setMuted(!el.audio.muted); }
  function onVolumeInput() {
    if (!el.volume || !el.audio) return;
    var next = toUnit(Number(el.volume.value) / 100);
    if (next === null) return;
    fadeDone = true;
    applyVolume(next, true);
    if (next > 0 && el.audio.muted) setMuted(false); /* dragging up from zero unmutes */
    dispatchState();
  }

  /* 05 — INTRO FADE (first playback after page load only) */
  function startFade() {
    if (!el.audio || fadeDone || !cfg.fadeIn) return;
    if (prefersReducedMotion()) { fadeDone = true; el.audio.volume = volumeTarget; return; }
    fadeDone = true; fading = true; var started = 0; el.audio.volume = 0;
    function step(now) {
      if (!fading || !el.audio) { fadeRaf = 0; return; }
      if (!started) started = now;
      var progress = clamp((now - started) / FADE_MS, 0, 1);
      el.audio.volume = clamp(volumeTarget * (1 - Math.pow(1 - progress, 3)), 0, 1);
      if (progress < 1) { fadeRaf = window.requestAnimationFrame(step); return; }
      fading = false; fadeRaf = 0; el.audio.volume = volumeTarget;
    }
    fadeRaf = window.requestAnimationFrame(step);
  }

  /* 06 — TRANSPORT UI + PROGRESS */
  function setPlayingUI(playing) {
    setFlag(el.player, 'is-playing', playing);
    if (playing) setFlag(el.player, 'is-buffering', false);
    if (!el.toggle) return;
    el.toggle.setAttribute('data-state', playing ? 'playing' : 'paused');
    el.toggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function setBuffering(value) { setFlag(el.player, 'is-buffering', !!value); }
  function updateProgressUI() {
    if (!el.audio) return;
    var duration = isFinite(el.audio.duration) ? el.audio.duration : 0;
    var current = isFinite(el.audio.currentTime) ? el.audio.currentTime : 0;
    var ratio = duration > 0 ? clamp(current / duration, 0, 1) : 0;
    setText(el.current, formatTime(current));
    if (el.progress) el.progress.value = String(Math.round(ratio * 1000));
    if (el.progressline) el.progressline.style.width = (ratio * 100).toFixed(2) + '%';
  }
  function updateDurationUI() {
    if (!el.audio) return;
    durationSec = isFinite(el.audio.duration) && el.audio.duration > 0 ? el.audio.duration : 0;
    setText(el.duration, formatTime(durationSec));
    updateProgressUI();
  }

  /* 07 — TRACK META + ART */
  function updateTrackUI() {
    var track = state.track;
    if (!track) return;
    setText(el.kicker, 'now playing');
    setText(el.title, track.title);
    setText(el.artist, track.artist);
    setFlag(el.player, 'is-error', false);
    if (!el.art) return;
    var cover = track.cover || '';
    if (cover) {
      if (el.art.getAttribute('src') !== cover) el.art.src = cover;
      el.art.hidden = !!(el.art.complete && el.art.naturalWidth === 0);
    } else { el.art.removeAttribute('src'); el.art.hidden = true; }
    el.art.alt = track.title ? track.title + ' cover' : '';
    setFlag(el.artBtn, 'is-fallback', !!el.art.hidden);
  }
  function onArtError() { if (el.art) el.art.hidden = true; setFlag(el.artBtn, 'is-fallback', true); }

  /* 08 — PLAYLIST RENDERING */
  function buildItem(track, index) {
    var li = document.createElement('li');
    li.className = 'playlist__item';
    li.setAttribute('data-index', String(index));
    li.innerHTML = '<button class="playlist__btn" type="button" data-index="' + index + '">' +
      '<span class="playlist__num">' + pad2(index + 1) + '</span>' +
      '<span class="playlist__thumb" aria-hidden="true"><img alt="" loading="lazy" decoding="async"></span>' +
      '<span class="playlist__info"><span class="playlist__name"></span><span class="playlist__artist"></span></span>' +
      '<span class="playlist__eq" aria-hidden="true"><i></i><i></i><i></i></span></button>';
    setText(li.querySelector('.playlist__name'), track.title);
    setText(li.querySelector('.playlist__artist'), track.artist);
    var thumb = li.querySelector('.playlist__thumb');
    var thumbImg = thumb ? thumb.querySelector('img') : null;
    if (thumbImg && track.cover) {
      thumbImg.src = track.cover;
      thumbImg.addEventListener('error', function () {
        if (thumb) thumb.classList.add('is-missing');
      });
    } else if (thumb) {
      thumb.classList.add('is-missing');
    }
    return li;
  }
  function renderPlaylist() {
    if (!el.playlistItems) return;
    var frag = document.createDocumentFragment();
    nodes = [];
    for (var i = 0; i < tracks.length; i += 1) {
      var node = buildItem(tracks[i], i);
      nodes.push(node);
      frag.appendChild(node);
    }
    el.playlistItems.textContent = '';
    el.playlistItems.appendChild(frag);
    highlightPlaylist();
    updatePlaylistCount();
  }
  function highlightPlaylist() {
    for (var i = 0; i < nodes.length; i += 1) {
      var li = nodes[i], current = i === state.index;
      setFlag(li, 'is-current', current);
      var btn = li.querySelector('.playlist__btn');
      if (!btn) continue;
      if (current) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
    }
  }
  function updatePlaylistCount() {
    if (!el.playlistCount) return;
    setText(el.playlistCount, state.total ? pad2(state.index + 1) + ' / ' + pad2(state.total) : '0 / 0');
  }

  /* 09 — TRACK LOADING */
  function clearSkipTimer() { if (skipTimer) window.clearTimeout(skipTimer); skipTimer = 0; }
  function loadTrack(index, options) {
    var opts = options || {};
    if (!el.audio || !tracks.length) return;
    var total = tracks.length, value = Number(index);
    var next = isFinite(value) ? Math.floor(value) : 0;
    next = ((next % total) + total) % total;
    clearSkipTimer();
    if (opts.resetErrors !== false) { streak = 0; allFailed = false; }
    errorHandled = false;
    state.index = next; state.track = tracks[next]; state.error = null; durationSec = 0;
    setFlag(el.player, 'is-error', false); setFlag(el.player, 'is-buffering', false);
    try { el.audio.src = state.track.src; } catch (e) { /* bad uri */ }
    updateTrackUI();
    highlightPlaylist();
    updatePlaylistCount();
    setText(el.current, '0:00'); setText(el.duration, '0:00');
    if (el.progress) el.progress.value = '0';
    if (el.progressline) el.progressline.style.width = '0%';
    updateMediaSession();
    if (!opts.silent) { dispatch('hikaru:player:track', trackPayload()); dispatchState(); }
  }

  /* 10 — PLAYBACK CONTROLS */
  function canPlay() { return !!(state.ready && !disabled && !allFailed && el.audio && tracks.length); }
  function handlePlayRejection(error, token) {
    if (token !== playToken) return false;
    wantPlay = false; setPlayingUI(false); setBuffering(false);
    var name = (error && error.name) || 'Error';
    if (name === 'AbortError') return false; /* superseded by a newer request — benign */
    state.error = { code: name, message: 'playback blocked' };
    var detail = { index: state.index, track: copyTrack(state.track), code: name, message: 'playback blocked' };
    dispatch('hikaru:player:error', detail); dispatch('hikaru:player:blocked', detail);
    dispatchState();
    return false;
  }
  function play() {
    if (!canPlay()) return Promise.resolve(false);
    var token = ++playToken;
    wantPlay = true;
    var promise;
    try { promise = el.audio.play(); } catch (error) { return Promise.resolve(handlePlayRejection(error, token)); }
    if (!promise || typeof promise.then !== 'function') return Promise.resolve(true);
    return promise.then(function () { return true; }, function (error) { return handlePlayRejection(error, token); });
  }
  function pause() {
    if (!el.audio) return;
    wantPlay = false; playToken += 1;
    try { el.audio.pause(); } catch (e) { /* ignore */ }
    setPlayingUI(false); setBuffering(false); dispatchState();
  }
  function toggle() {
    if (!canPlay()) return Promise.resolve(false);
    if (el.audio.paused) return play();
    pause();
    return Promise.resolve(true);
  }
  function step(direction) {
    if (!canPlay()) return;
    var wasPlaying = wantPlay || !el.audio.paused;
    streak = 0;
    loadTrack((state.index + direction + tracks.length) % tracks.length);
    if (wasPlaying) play(); else setPlayingUI(false);
  }
  function next() { step(1); }
  function prev() { step(-1); }
  function playIndex(index) {
    if (!canPlay()) return false;
    var value = Number(index);
    if (!isFinite(value)) return false;
    var next = Math.floor(value);
    if (next < 0 || next >= tracks.length) return false;
    if (next === state.index) { play(); return true; }
    loadTrack(next); play(); return true;
  }

  /* 11 — SEEKING + SCRUBBING */
  function seek(ratio) {
    if (!el.audio) return;
    var duration = el.audio.duration;
    if (!isFinite(duration) || duration <= 0) return;
    var unit = toUnit(ratio);
    if (unit === null) return;
    try { el.audio.currentTime = unit * duration; } catch (e) { return; }
    updateProgressUI(); dispatchState();
  }
  function onScrubStart() {
    if (!el.audio) return;
    scrubbing = true;
    setFlag(el.player, 'is-scrubbing', true);
  }
  function onScrubMove() {
    if (!el.audio || !el.progress) return;
    var duration = el.audio.duration;
    if (!isFinite(duration) || duration <= 0) return;
    var ratio = clamp(Number(el.progress.value) / 1000, 0, 1);
    try { el.audio.currentTime = ratio * duration; } catch (e) { return; }
    setText(el.current, formatTime(ratio * duration));
    if (el.progressline) el.progressline.style.width = (ratio * 100).toFixed(2) + '%';
  }
  function onScrubEnd() {
    if (!scrubbing) return;
    scrubbing = false;
    setFlag(el.player, 'is-scrubbing', false);
    updateProgressUI(); dispatchState();
  }
  function onTimeUpdate() { if (!scrubbing) updateProgressUI(); }

  /* 12 — ERRORS + AUTO-SKIP */
  function scheduleSkip(resume) {
    skipResume = !!resume;
    clearSkipTimer();
    skipTimer = window.setTimeout(function () {
      skipTimer = 0;
      if (!tracks.length || allFailed || disabled) return;
      loadTrack((state.index + 1) % tracks.length, { resetErrors: false });
      if (skipResume) play();
    }, SKIP_DELAY);
  }
  function markOffline() {
    allFailed = true; wantPlay = false; clearSkipTimer();
    if (el.audio) { try { el.audio.pause(); } catch (e) { /* ignore */ } }
    setPlayingUI(false); setBuffering(false);
    setFlag(el.player, 'is-disabled', true); setFlag(el.player, 'is-error', true);
    setText(el.kicker, 'audio offline'); setText(el.title, 'audio offline');
    setText(el.artist, '\u2014');
    state.error = { code: 'offline', message: 'all tracks failed' };
    dispatchState();
  }
  function markDisabled() {
    disabled = true;
    setFlag(el.player, 'is-disabled', true);
    setText(el.kicker, 'audio offline'); setText(el.title, 'audio offline');
    setText(el.artist, '\u2014');
    if (el.playlistCount) setText(el.playlistCount, '0 / 0');
    setPlayingUI(false); dispatchState();
  }
  function onAudioFailure(kind) {
    if (!el.audio || !tracks.length || allFailed || disabled) return;
    if (errorHandled) return;
    if (kind === 'stalled' && el.audio.readyState >= 2) return;
    errorHandled = true;
    var wasPlaying = wantPlay || !el.audio.paused;
    wantPlay = false;
    streak += 1;
    setPlayingUI(false); setBuffering(false);
    setFlag(el.player, 'is-error', true);
    setText(el.kicker, 'track unavailable');
    if (state.track) { setText(el.title, state.track.title); setText(el.artist, state.track.artist); }
    var code = el.audio.error ? el.audio.error.code : null;
    var message = (el.audio.error && el.audio.error.message) || 'media error';
    state.error = { code: code, message: message };
    dispatch('hikaru:player:error', { index: state.index, track: copyTrack(state.track), code: code, message: message });
    dispatchState();
    if (streak >= tracks.length) markOffline();
    else scheduleSkip(wasPlaying);
  }

  /* 13 — MEDIA SESSION */
  function tryAction(action, handler) {
    try { window.navigator.mediaSession.setActionHandler(action, handler); } catch (e) { /* unsupported */ }
  }
  function bindMediaActions() {
    if (mediaBound || !('mediaSession' in window.navigator)) return;
    mediaBound = true;
    tryAction('play', function () { play(); }); tryAction('pause', function () { pause(); });
    tryAction('previoustrack', function () { prev(); }); tryAction('nexttrack', function () { next(); });
    tryAction('seekto', function (details) {
      if (!details || typeof details.seekTime !== 'number' || !el.audio) return;
      try { el.audio.currentTime = details.seekTime; } catch (e) { /* ignore */ }
    });
  }
  function updateMediaSession() {
    if (!('mediaSession' in window.navigator) || !state.track) return;
    try {
      if (typeof window.MediaMetadata === 'function') {
        window.navigator.mediaSession.metadata = new window.MediaMetadata({
          title: state.track.title || '', artist: state.track.artist || '', album: 'Lovely Hikaru',
          artwork: state.track.cover ? [{ src: state.track.cover, sizes: '800x800', type: 'image/jpeg' }] : []
        });
      }
    } catch (e) { /* ignore */ }
    bindMediaActions();
  }

  /* 14 — PLAYLIST PANEL */
  function setPlaylistExpanded(expanded) {
    var value = expanded ? 'true' : 'false';
    if (el.playlistToggle) el.playlistToggle.setAttribute('aria-expanded', value);
    if (el.artBtn) el.artBtn.setAttribute('aria-expanded', value);
  }
  function openPlaylist() {
    if (!el.playlist || playlistOpen) return;
    if (playlistTimer) { window.clearTimeout(playlistTimer); playlistTimer = 0; }
    playlistOpen = true;
    el.playlist.hidden = false;
    window.requestAnimationFrame(function () {
      if (playlistOpen && el.playlist) el.playlist.classList.add('is-open');
    });
    setPlaylistExpanded(true);
  }
  function closePlaylist() {
    if (!el.playlist || !playlistOpen) return;
    playlistOpen = false;
    el.playlist.classList.remove('is-open');
    setPlaylistExpanded(false);
    if (playlistTimer) window.clearTimeout(playlistTimer);
    playlistTimer = window.setTimeout(function () {
      playlistTimer = 0;
      if (!playlistOpen && el.playlist) el.playlist.hidden = true;
    }, CLOSE_MS);
  }
  function togglePlaylist() { if (playlistOpen) closePlaylist(); else openPlaylist(); }
  function onPlaylistClick(event) {
    var target = event.target;
    if (!target || !target.closest || !el.playlistItems) return;
    var btn = target.closest('.playlist__btn');
    if (!btn || !el.playlistItems.contains(btn)) return;
    var index = Number(btn.getAttribute('data-index'));
    if (!isFinite(index)) return;
    playIndex(index); closePlaylist();
  }
  function onDocumentClick(event) {
    if (!playlistOpen) return;
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('#playlist')) return;
    if (target.closest('#player-playlist-toggle') || target.closest('#player-art-btn')) return;
    closePlaylist();
  }
  function onDocumentKeydown(event) { if (playlistOpen && event.key === 'Escape') closePlaylist(); }

  /* 15 — AUDIO ELEMENT EVENTS */
  function onAudioPlay() { wantPlay = true; setPlayingUI(true); dispatchState(); }
  function onAudioPlaying() {
    wantPlay = true; setBuffering(false); setPlayingUI(true);
    setFlag(el.player, 'is-error', false);
    startFade();
  }
  function onAudioPause() {
    if (wantPlay) return; /* transient pause while a new source loads */
    setPlayingUI(false); setBuffering(false); dispatchState();
  }
  function onAudioEnded() {
    if (!el.audio || !tracks.length || disabled) return;
    updateDurationUI(); setBuffering(false);
    streak = 0;
    loadTrack((state.index + 1) % tracks.length);
    play();
  }

  /* 16 — WIRING + INIT */
  function bindEvents() {
    var clicks = [[el.toggle, toggle], [el.prev, prev], [el.next, next], [el.mute, toggleMute],
      [el.playlistToggle, togglePlaylist], [el.artBtn, togglePlaylist], [el.playlistClose, closePlaylist]];
    for (var i = 0; i < clicks.length; i += 1) on(clicks[i][0], 'click', clicks[i][1]);

    on(el.volume, 'input', onVolumeInput, { passive: true });
    on(el.progress, 'pointerdown', onScrubStart, { passive: true });
    on(el.progress, 'input', onScrubMove, { passive: true });
    on(el.progress, 'change', onScrubEnd);
    on(el.playlistItems, 'click', onPlaylistClick);
    on(el.art, 'error', onArtError);
    on(document, 'keydown', onDocumentKeydown);
    on(document, 'click', onDocumentClick);
    on(document, 'pointerup', onScrubEnd, { passive: true });

    var audio = [['play', onAudioPlay], ['pause', onAudioPause], ['playing', onAudioPlaying],
      ['waiting', function () { setBuffering(true); }], ['canplay', function () { setBuffering(false); }],
      ['loadedmetadata', function () { updateDurationUI(); setBuffering(false); }],
      ['durationchange', updateDurationUI], ['timeupdate', onTimeUpdate], ['ended', onAudioEnded],
      ['error', function () { onAudioFailure('error'); }], ['stalled', function () { onAudioFailure('stalled'); }]];
    for (var j = 0; j < audio.length; j += 1) on(el.audio, audio[j][0], audio[j][1]);
  }
  function cacheRefs() {
    el.player = qs('#player'); el.audio = qs('#audio'); el.toggle = qs('#player-toggle');
    el.prev = qs('#player-prev'); el.next = qs('#player-next'); el.artBtn = qs('#player-art-btn');
    el.art = qs('#player-art'); el.kicker = qs('#player-kicker'); el.title = qs('#player-title');
    el.artist = qs('#player-artist'); el.current = qs('#player-current'); el.duration = qs('#player-duration');
    el.progress = qs('#player-progress'); el.progressline = qs('#player-progressline');
    el.volume = qs('#player-volume'); el.volumeLabel = qs('#player-volume-label');
    el.mute = qs('#player-mute'); el.playlistToggle = qs('#player-playlist-toggle');
    el.playlist = qs('#playlist'); el.playlistClose = qs('#playlist-close');
    el.playlistItems = qs('#playlist-items'); el.playlistCount = qs('#playlist-count');
  }
  function init() {
    if (initialized) return api;
    cfg = readConfig();
    cacheRefs();
    if (!el.player || !el.audio) return api;
    initialized = true;
    tracks = (Array.isArray(cfg.tracks) ? cfg.tracks : []).filter(function (t) {
      return !!(t && typeof t.src === 'string' && t.src);
    });
    state.total = tracks.length; state.track = null; state.error = null;
    applyVolume(resolveVolume(), false); setMuted(!!el.audio.muted); bindEvents();
    state.ready = true; api.ready = true;
    if (cfg.enabled === false || !tracks.length) {
      markDisabled();
    } else {
      state.index = cfg.startRandom ? randInt(0, tracks.length - 1) : 0;
      renderPlaylist();
      loadTrack(state.index, { silent: true });
      setPlayingUI(false); setBuffering(false);
    }
    setPlaylistExpanded(false);
    dispatch('hikaru:player:ready', trackPayload()); if (!disabled) dispatch('hikaru:player:track', trackPayload());
    dispatchState();
    return api;
  }

  /* 17 — PUBLIC API */
  var api = {
    init: init, play: play, pause: pause, toggle: toggle, next: next, prev: prev,
    playIndex: playIndex, seek: seek, setVolume: setVolume, getVolume: getVolume,
    toggleMute: toggleMute, setMuted: setMuted, getState: getState,
    getTracks: function () { return tracks.slice(); }, ready: false
  };

  window.HikaruPlayer = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); }, { once: true });
  } else {
    init();
  }
})();
