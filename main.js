/**
 * ===================================================================
 * HIKARU — MINIMAL MONOCHROME PERSONAL PROFILE JAVASCRIPT
 * Strictly Monochrome: Black, Charcoal, Gray, Silver, White
 * Compatible with GitHub Pages. Pure vanilla JavaScript.
 * ===================================================================
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. CONFIGURATION RESOLVER
   * ------------------------------------------------------------------ */
  const DEFAULT_CONFIG = {
    name: "Hikaru",
    username: "HikaruIR",
    bio: "Not sure about that🍃",
    location: "IRAN",
    avatar: "avatar.jpg",
    background: "background.jpg",
    effect: "alternate", // "alternate", "snow", "rain", or "off"
    discordUrl: "https://discord.gg/vYa9e5HCw",
    githubUrl: "https://github.com/HikaruIR",
    telegramUrl: "https://t.me/hikaru_mp4",
    youtubeUrl: "https://www.youtube.com/@Mamad214-11",
    instagramUrl: "https://instagram.com/",
    playlist: [
      {
        title: "Far from Any Road",
        artist: "The Handsome Family",
        src: "music.mp3"
      },
      {
        title: "Army Dreamers",
        artist: "Kate Bush",
        src: "music2.mp3"
      }
    ],
    stats: {
      projectsCount: "4"
    }
  };

  const CFG = Object.assign({}, DEFAULT_CONFIG, window.HIKARU_CONFIG || {});

  /* ------------------------------------------------------------------
   * 2. STATE MANAGER
   * ------------------------------------------------------------------ */
  const STATE = {
    entered: false,
    currentTrackIndex: 0,
    isPlaying: false,
    volume: 0.5,
    isMuted: false,
    weatherMode: 'snow',
    viewsCount: 1
  };

  /* ------------------------------------------------------------------
   * 3. DOM ELEMENT REFERENCES
   * ------------------------------------------------------------------ */
  const DOM = {
    enterScreen: document.getElementById('enter-screen'),
    mainWrapper: document.getElementById('main-wrapper'),
    bgMedia: document.getElementById('bg-media'),
    mouseGlow: document.getElementById('mouse-glow'),
    weatherCanvas: document.getElementById('weather-canvas'),
    weatherToggle: document.getElementById('weather-toggle'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherLabel: document.getElementById('weather-label'),
    quickMuteToggle: document.getElementById('quick-mute-toggle'),
    quickAudioLabel: document.getElementById('quick-audio-label'),
    shareBtn: document.getElementById('share-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),

    // Identity
    profileAvatar: document.getElementById('profile-avatar'),
    profileName: document.getElementById('profile-name'),
    profileUsername: document.getElementById('profile-username'),
    profileBio: document.getElementById('profile-bio'),
    profileLocation: document.getElementById('profile-location'),

    // Social Links
    linkDiscord: document.getElementById('link-discord'),
    linkGithub: document.getElementById('link-github'),
    linkTelegram: document.getElementById('link-telegram'),
    linkYoutube: document.getElementById('link-youtube'),
    linkInstagram: document.getElementById('link-instagram'),

    // Statistics
    statViews: document.getElementById('stat-views'),
    statProjects: document.getElementById('stat-projects'),

    // Music Player
    audioElement: document.getElementById('audio-element'),
    albumDisc: document.getElementById('album-disc')?.querySelector('.vinyl-disc'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    audioEqualizer: document.getElementById('audio-equalizer'),
    btnPrev: document.getElementById('btn-prev'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnNext: document.getElementById('btn-next'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),
    currentTime: document.getElementById('current-time'),
    durationTime: document.getElementById('duration-time'),
    progressBarContainer: document.getElementById('progress-bar-container'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressThumb: document.getElementById('progress-thumb'),
    trackIndicator: document.getElementById('track-indicator'),
    volumeToggleBtn: document.getElementById('volume-toggle-btn'),
    volumeRange: document.getElementById('volume-slider'),
    volumeSvgHigh: document.getElementById('volume-svg-high'),
    volumeSvgMuted: document.getElementById('volume-svg-muted'),

    // Custom Cursor
    cursorDot: document.getElementById('cursor-dot'),
    cursorRing: document.getElementById('cursor-ring')
  };

  /* ------------------------------------------------------------------
   * 4. WEATHER ENGINE (Monochrome Snow & Rain)
   * Alternates between Snow and Rain on each page refresh
   * ------------------------------------------------------------------ */
  const WeatherEngine = {
    canvas: DOM.weatherCanvas,
    ctx: null,
    particles: [],
    width: 0,
    height: 0,
    animId: null,
    isRunning: false,

    init() {
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resolveMode();
      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.updateUI();

      if (DOM.weatherToggle) {
        DOM.weatherToggle.addEventListener('click', () => this.cycleMode());
      }

      this.createParticles();
      this.start();
    },

    resolveMode() {
      const effectConfig = (CFG.effect || 'alternate').toLowerCase();
      const storageKey = 'hikaru_weather_last';
      const lastMode = localStorage.getItem(storageKey);

      if (effectConfig === 'alternate') {
        const nextMode = (lastMode === 'snow') ? 'rain' : 'snow';
        STATE.weatherMode = nextMode;
        localStorage.setItem(storageKey, nextMode);
      } else if (effectConfig === 'snow') {
        STATE.weatherMode = 'snow';
      } else if (effectConfig === 'rain') {
        STATE.weatherMode = 'rain';
      } else if (effectConfig === 'off') {
        STATE.weatherMode = 'off';
      } else {
        STATE.weatherMode = 'snow';
      }
    },

    cycleMode() {
      if (STATE.weatherMode === 'snow') {
        STATE.weatherMode = 'rain';
      } else if (STATE.weatherMode === 'rain') {
        STATE.weatherMode = 'off';
      } else {
        STATE.weatherMode = 'snow';
      }

      localStorage.setItem('hikaru_weather_last', STATE.weatherMode);
      this.updateUI();
      this.createParticles();
      showToast(`Weather effect: ${STATE.weatherMode.toUpperCase()}`);
    },

    updateUI() {
      if (!DOM.weatherIcon || !DOM.weatherLabel) return;
      if (STATE.weatherMode === 'snow') {
        DOM.weatherIcon.textContent = '❄️';
        DOM.weatherLabel.textContent = 'Snow';
      } else if (STATE.weatherMode === 'rain') {
        DOM.weatherIcon.textContent = '🌧️';
        DOM.weatherLabel.textContent = 'Rain';
      } else {
        DOM.weatherIcon.textContent = '✨';
        DOM.weatherLabel.textContent = 'Clear';
      }
    },

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.createParticles();
    },

    createParticles() {
      this.particles = [];
      if (STATE.weatherMode === 'off') return;

      const isMobile = window.innerWidth < 768;

      if (STATE.weatherMode === 'snow') {
        const count = isMobile ? 40 : 80;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius: Math.random() * 2 + 0.8,
            opacity: Math.random() * 0.55 + 0.25,
            speedY: Math.random() * 1.1 + 0.45,
            sway: Math.random() * 0.02 + 0.005,
            swayOffset: Math.random() * Math.PI * 2
          });
        }
      } else if (STATE.weatherMode === 'rain') {
        const count = isMobile ? 50 : 100;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            length: Math.random() * 16 + 10,
            speedY: Math.random() * 11 + 9,
            speedX: -1.2,
            opacity: Math.random() * 0.35 + 0.15,
            width: Math.random() * 0.9 + 0.5
          });
        }
      }
    },

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      const render = () => {
        if (!this.isRunning) return;
        this.draw();
        this.animId = requestAnimationFrame(render);
      };
      this.animId = requestAnimationFrame(render);
    },

    stop() {
      this.isRunning = false;
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
    },

    draw() {
      const ctx = this.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, this.width, this.height);

      if (STATE.weatherMode === 'off') return;

      if (STATE.weatherMode === 'snow') {
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          p.swayOffset += p.sway;
          p.y += p.speedY;
          p.x += Math.sin(p.swayOffset) * 0.7;

          if (p.y > this.height + 5) {
            p.y = -5;
            p.x = Math.random() * this.width;
          }
          if (p.x > this.width + 5) p.x = -5;
          if (p.x < -5) p.x = this.width + 5;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.shadowBlur = p.radius * 1.5;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();
        }
      } else if (STATE.weatherMode === 'rain') {
        ctx.shadowBlur = 0;
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y > this.height) {
            p.y = -p.length;
            p.x = Math.random() * this.width;
          }
          if (p.x < -10) p.x = this.width + 10;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 1.5, p.y + p.length);
          ctx.strokeStyle = `rgba(220, 220, 220, ${p.opacity})`;
          ctx.lineWidth = p.width;
          ctx.stroke();
        }
      }
    }
  };

  /* ------------------------------------------------------------------
   * 5. MUSIC PLAYER ENGINE
   * ------------------------------------------------------------------ */
  const MusicPlayer = {
    audio: DOM.audioElement,
    playlist: CFG.playlist && CFG.playlist.length ? CFG.playlist : DEFAULT_CONFIG.playlist,
    isDraggingProgress: false,

    init() {
      if (!this.audio) return;

      const savedVol = localStorage.getItem('hikaru_music_volume');
      if (savedVol !== null) {
        STATE.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
      this.audio.volume = STATE.volume;
      if (DOM.volumeRange) DOM.volumeRange.value = STATE.volume;

      this.loadTrack(0, false);

      if (DOM.btnPlayPause) {
        DOM.btnPlayPause.addEventListener('click', () => this.togglePlay());
      }
      if (DOM.btnPrev) {
        DOM.btnPrev.addEventListener('click', () => this.prevTrack());
      }
      if (DOM.btnNext) {
        DOM.btnNext.addEventListener('click', () => this.nextTrack());
      }

      this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
      this.audio.addEventListener('ended', () => this.onEnded());
      this.audio.addEventListener('play', () => this.setPlayUI(true));
      this.audio.addEventListener('pause', () => this.setPlayUI(false));

      if (DOM.progressBarContainer) {
        DOM.progressBarContainer.addEventListener('click', (e) => this.seek(e));
        DOM.progressBarContainer.addEventListener('mousedown', (e) => {
          this.isDraggingProgress = true;
          this.seek(e);
        });
        window.addEventListener('mousemove', (e) => {
          if (this.isDraggingProgress) this.seek(e);
        });
        window.addEventListener('mouseup', () => {
          this.isDraggingProgress = false;
        });
      }

      if (DOM.volumeRange) {
        DOM.volumeRange.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.setVolume(val);
        });
      }

      if (DOM.volumeToggleBtn) {
        DOM.volumeToggleBtn.addEventListener('click', () => this.toggleMute());
      }
      if (DOM.quickMuteToggle) {
        DOM.quickMuteToggle.addEventListener('click', () => this.toggleMute());
      }

      window.addEventListener('keydown', (e) => {
        if (!STATE.entered) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.toggleMute();
        } else if (e.code === 'Space') {
          e.preventDefault();
          this.togglePlay();
        }
      });
    },

    loadTrack(index, autoplay = false) {
      if (!this.playlist || !this.playlist.length) return;
      STATE.currentTrackIndex = (index + this.playlist.length) % this.playlist.length;
      const track = this.playlist[STATE.currentTrackIndex];

      if (DOM.songTitle) DOM.songTitle.textContent = track.title || "Unknown Title";
      if (DOM.songArtist) DOM.songArtist.textContent = track.artist || "Hikaru";
      if (DOM.trackIndicator) {
        DOM.trackIndicator.textContent = `Track ${STATE.currentTrackIndex + 1} of ${this.playlist.length}`;
      }

      this.audio.src = track.src;
      this.audio.load();

      if (autoplay) {
        this.play();
      }
    },

    play() {
      if (!this.audio.src) return;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            STATE.isPlaying = true;
            this.setPlayUI(true);
          })
          .catch((err) => {
            console.warn("Audio waiting for user gesture:", err);
            STATE.isPlaying = false;
            this.setPlayUI(false);
          });
      }
    },

    pause() {
      this.audio.pause();
      STATE.isPlaying = false;
      this.setPlayUI(false);
    },

    togglePlay() {
      if (this.audio.paused) {
        this.play();
      } else {
        this.pause();
      }
    },

    prevTrack() {
      this.loadTrack(STATE.currentTrackIndex - 1, true);
    },

    nextTrack() {
      this.loadTrack(STATE.currentTrackIndex + 1, true);
    },

    onEnded() {
      this.nextTrack();
    },

    onLoadedMetadata() {
      if (DOM.durationTime && this.audio.duration) {
        DOM.durationTime.textContent = formatTime(this.audio.duration);
      }
    },

    onTimeUpdate() {
      if (this.isDraggingProgress) return;
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 1;
      const pct = (cur / dur) * 100;

      if (DOM.currentTime) DOM.currentTime.textContent = formatTime(cur);
      if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${pct}%`;
      if (DOM.progressThumb) DOM.progressThumb.style.left = `${pct}%`;
      if (DOM.progressBarContainer) {
        DOM.progressBarContainer.setAttribute('aria-valuenow', Math.round(pct));
      }
    },

    seek(e) {
      if (!DOM.progressBarContainer || !this.audio.duration) return;
      const rect = DOM.progressBarContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      let ratio = clickX / width;
      ratio = Math.max(0, Math.min(1, ratio));

      this.audio.currentTime = ratio * this.audio.duration;
      if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${ratio * 100}%`;
      if (DOM.progressThumb) DOM.progressThumb.style.left = `${ratio * 100}%`;
      if (DOM.currentTime) DOM.currentTime.textContent = formatTime(this.audio.currentTime);
    },

    setVolume(val) {
      val = Math.max(0, Math.min(1, val));
      STATE.volume = val;
      this.audio.volume = val;
      STATE.isMuted = (val === 0);
      localStorage.setItem('hikaru_music_volume', val);
      this.updateVolumeUI();
    },

    toggleMute() {
      if (STATE.isMuted || this.audio.volume === 0) {
        const restoreVol = STATE.volume > 0 ? STATE.volume : 0.5;
        this.setVolume(restoreVol);
        if (DOM.volumeRange) DOM.volumeRange.value = restoreVol;
        showToast("Audio unmuted");
      } else {
        this.audio.volume = 0;
        STATE.isMuted = true;
        if (DOM.volumeRange) DOM.volumeRange.value = 0;
        this.updateVolumeUI();
        showToast("Audio muted");
      }
    },

    updateVolumeUI() {
      const isMuted = STATE.isMuted || this.audio.volume === 0;

      if (DOM.volumeSvgHigh && DOM.volumeSvgMuted) {
        if (isMuted) {
          DOM.volumeSvgHigh.classList.add('hidden');
          DOM.volumeSvgMuted.classList.remove('hidden');
        } else {
          DOM.volumeSvgHigh.classList.remove('hidden');
          DOM.volumeSvgMuted.classList.add('hidden');
        }
      }

      if (DOM.quickAudioLabel) {
        DOM.quickAudioLabel.textContent = isMuted ? "Sound Off" : "Sound On";
      }
    },

    setPlayUI(isPlaying) {
      if (DOM.playIcon && DOM.pauseIcon) {
        if (isPlaying) {
          DOM.playIcon.classList.add('hidden');
          DOM.pauseIcon.classList.remove('hidden');
        } else {
          DOM.playIcon.classList.remove('hidden');
          DOM.pauseIcon.classList.add('hidden');
        }
      }

      if (DOM.albumDisc) {
        if (isPlaying) {
          DOM.albumDisc.classList.add('playing');
        } else {
          DOM.albumDisc.classList.remove('playing');
        }
      }

      if (DOM.audioEqualizer) {
        if (isPlaying) {
          DOM.audioEqualizer.classList.add('playing');
        } else {
          DOM.audioEqualizer.classList.remove('playing');
        }
      }
    }
  };

  /* ------------------------------------------------------------------
   * 6. ENTRANCE SCREEN MANAGER
   * ------------------------------------------------------------------ */
  const EntranceManager = {
    init() {
      if (!DOM.enterScreen) return;

      const triggerEntrance = () => {
        if (STATE.entered) return;
        STATE.entered = true;

        DOM.enterScreen.classList.add('dismissed');

        if (DOM.mainWrapper) {
          DOM.mainWrapper.classList.remove('hidden');
        }

        MusicPlayer.play();
        StatsManager.animateViews();

        setTimeout(() => {
          DOM.enterScreen.style.display = 'none';
        }, 900);
      };

      DOM.enterScreen.addEventListener('click', triggerEntrance);

      window.addEventListener('keydown', (e) => {
        if (!STATE.entered && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          triggerEntrance();
        }
      });
    }
  };

  /* ------------------------------------------------------------------
   * 7. STATS COUNTER (REAL VISITS ONLY - NO FAKE NUMBERS)
   * ------------------------------------------------------------------ */
  const StatsManager = {
    init() {
      // Real visit counter: starts at 1, increments strictly per real visitor visit
      const storageKey = 'hikaru_real_visitor_views';
      const savedViews = localStorage.getItem(storageKey);
      let views = savedViews ? parseInt(savedViews, 10) : 0;
      if (isNaN(views) || views < 0) views = 0;

      // Increment real visit count by 1
      views += 1;
      STATE.viewsCount = views;
      localStorage.setItem(storageKey, views);

      if (DOM.statViews) DOM.statViews.textContent = formatNumber(views);
      if (DOM.statProjects) DOM.statProjects.textContent = CFG.stats.projectsCount || "4";
    },

    animateViews() {
      if (!DOM.statViews) return;
      const target = STATE.viewsCount;
      const start = 0;
      const duration = 600;
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        const current = Math.floor(start + (target - start) * easeOutQuad);
        DOM.statViews.textContent = formatNumber(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          DOM.statViews.textContent = formatNumber(target);
        }
      };

      requestAnimationFrame(step);
    }
  };

  /* ------------------------------------------------------------------
   * 8. CUSTOM CURSOR & AMBIENT MOUSE GLOW (Monochrome)
   * ------------------------------------------------------------------ */
  const CursorManager = {
    dot: DOM.cursorDot,
    ring: DOM.cursorRing,
    glow: DOM.mouseGlow,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    ringX: window.innerWidth / 2,
    ringY: window.innerHeight / 2,

    init() {
      if (window.matchMedia('(pointer: coarse)').matches) return;

      window.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;

        if (this.dot) {
          this.dot.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px)`;
        }

        if (this.glow) {
          this.glow.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px) translate(-50%, -50%)`;
        }
      });

      const loop = () => {
        this.ringX += (this.mouseX - this.ringX) * 0.16;
        this.ringY += (this.mouseY - this.ringY) * 0.16;

        if (this.ring) {
          this.ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px) translate(-50%, -50%)`;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      const interactiveTargets = 'a, button, input[type="range"], .project-card, .enter-screen';
      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveTargets)) {
          if (this.ring) this.ring.classList.add('hovering');
        }
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveTargets)) {
          if (this.ring) this.ring.classList.remove('hovering');
        }
      });
    }
  };

  /* ------------------------------------------------------------------
   * 9. SOCIAL LINKS, COPY SHARE & TOAST
   * ------------------------------------------------------------------ */
  function setupInteractiveElements() {
    if (DOM.linkDiscord) DOM.linkDiscord.href = CFG.discordUrl || "#";
    if (DOM.linkGithub) DOM.linkGithub.href = CFG.githubUrl || "#";
    if (DOM.linkTelegram) DOM.linkTelegram.href = CFG.telegramUrl || "#";
    if (DOM.linkYoutube) DOM.linkYoutube.href = CFG.youtubeUrl || "#";
    if (DOM.linkInstagram) DOM.linkInstagram.href = CFG.instagramUrl || "#";

    if (DOM.profileName) DOM.profileName.textContent = CFG.name;
    if (DOM.profileUsername) DOM.profileUsername.textContent = `@${CFG.username.replace('@', '')}`;
    if (DOM.profileBio) DOM.profileBio.textContent = CFG.bio;
    if (DOM.profileLocation) DOM.profileLocation.textContent = CFG.location;

    if (DOM.profileAvatar && CFG.avatar) {
      DOM.profileAvatar.src = CFG.avatar;
      DOM.profileAvatar.onerror = function () {
        this.onerror = null;
        this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23111111'/%3E%3Ctext x='50' y='58' font-size='32' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='bold'%3EH%3C/text%3E%3C/svg%3E";
      };
    }

    if (DOM.bgMedia && CFG.background) {
      DOM.bgMedia.style.backgroundImage = `url('${CFG.background}')`;
    }

    if (DOM.shareBtn) {
      DOM.shareBtn.addEventListener('click', () => {
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url)
            .then(() => showToast("Profile URL copied to clipboard!"))
            .catch(() => fallbackCopy(url));
        } else {
          fallbackCopy(url);
        }
      });
    }
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showToast("Profile URL copied to clipboard!");
    } catch (e) {
      showToast("Link: " + text);
    }
    document.body.removeChild(tempInput);
  }

  let toastTimer = null;
  function showToast(msg) {
    if (!DOM.toast || !DOM.toastMessage) return;
    DOM.toastMessage.textContent = msg;
    DOM.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.remove('visible');
    }, 2400);
  }

  /* ------------------------------------------------------------------
   * 10. ANIMATED TAB TITLE (guns.lol Minimalist)
   * ------------------------------------------------------------------ */
  const TitleAnimator = {
    baseTitle: "Hikaru",
    frames: ["Hikaru ✦", "Hikaru ✦ ✦", "Hikaru ✦ ✦ ✦", "Hikaru — Personal Profile"],
    frameIndex: 0,
    interval: null,

    init() {
      this.interval = setInterval(() => {
        document.title = this.frames[this.frameIndex];
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      }, 1800);

      window.addEventListener('blur', () => {
        document.title = "Hikaru — Waiting for you...";
      });
      window.addEventListener('focus', () => {
        document.title = this.baseTitle;
      });
    }
  };

  /* ------------------------------------------------------------------
   * 11. UTILITY FUNCTIONS
   * ------------------------------------------------------------------ */
  function formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  }

  function formatNumber(num) {
    return Number(num).toLocaleString('en-US');
  }

  /* ------------------------------------------------------------------
   * 12. BOOTSTRAP INITIALIZATION
   * ------------------------------------------------------------------ */
  function init() {
    setupInteractiveElements();
    WeatherEngine.init();
    MusicPlayer.init();
    EntranceManager.init();
    StatsManager.init();
    CursorManager.init();
    TitleAnimator.init();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        WeatherEngine.stop();
      } else {
        WeatherEngine.start();
      }
    });

    console.log("%c Hikaru %c Minimal Monochrome Profile Loaded ", 
      "background: #ffffff; color: #000000; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
      "background: #181818; color: #ffffff; padding: 4px 8px; border-radius: 0 4px 4px 0;");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
