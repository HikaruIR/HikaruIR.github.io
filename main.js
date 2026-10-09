/**
 * Hikaru Bio Link / Info Page Logic
 * - Real playlist from local musics/ folder
 * - Particle engine (falling monochrome maple leaves)
 * - Timeline scrub & playback controls
 * - 3D Card Parallax Tilt
 */

(() => {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Canvas Particle System (Falling Maple Leaves / Embers)
     -------------------------------------------------------------------------- */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  class Leaf {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : -20;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 0.9 + 0.4;
      this.speedX = Math.random() * 0.7 - 0.35;
      this.angle = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.y += this.speedY;
      this.x += Math.sin(this.angle) * 0.8 + this.speedX;
      this.angle += this.rotationSpeed;

      if (this.y > height + 20 || this.x < -30 || this.x > width + 30) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = `rgba(220, 220, 225, ${this.opacity})`;

      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.bezierCurveTo(this.size * 0.8, -this.size * 0.5, this.size, 0, 0, this.size);
      ctx.bezierCurveTo(-this.size, 0, -this.size * 0.8, -this.size * 0.5, 0, -this.size);
      ctx.fill();
      ctx.restore();
    }
  }

  const particleCount = 35;
  const particles = Array.from({ length: particleCount }, () => new Leaf());

  function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  /* --------------------------------------------------------------------------
     2. Playlist & Audio Player
     -------------------------------------------------------------------------- */
  const playlist = [
    { title: "Summertime sadness", file: "musics/summertime-sadness.mp3" },
    { title: "Cigarettes out the Window", file: "musics/cigarettes.mp3" },
    { title: "Devil in Disguise", file: "musics/devil.mp3" },
    { title: "her", file: "musics/her.mp3" },
    { title: "Stan", file: "musics/stan.mp3" },
    { title: "Story of warrior", file: "musics/warrior.mp3" },
    { title: "Sweater Weather", file: "musics/sweater-weather.m4a" }
  ];

  let currentTrackIdx = 0;
  const audio = document.getElementById('audio-player');
  const enterOverlay = document.getElementById('enter-overlay');
  const btnPlay = document.getElementById('btn-play');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const audioToggle = document.getElementById('audio-toggle');
  const iconVolume = document.getElementById('icon-volume');
  const iconMuted = document.getElementById('icon-muted');
  const trackTitleEl = document.getElementById('track-title');
  const currTimeEl = document.getElementById('curr-time');
  const totalTimeEl = document.getElementById('total-time');
  const progressFill = document.getElementById('progress-fill');
  const progressContainer = document.getElementById('progress-container');

  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function loadTrack(idx, autoPlay = true) {
    currentTrackIdx = (idx + playlist.length) % playlist.length;
    const track = playlist[currentTrackIdx];
    audio.src = encodeURI(track.file);
    trackTitleEl.textContent = track.title;
    progressFill.style.width = '0%';
    currTimeEl.textContent = '0:00';
    
    if (autoPlay) {
      audio.play().catch(() => {});
      updatePlayButtonUI(true);
    }
  }

  function updatePlayButtonUI(playing) {
    if (playing) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const current = audio.currentTime;
    const duration = audio.duration;
    currTimeEl.textContent = formatTime(current);
    totalTimeEl.textContent = formatTime(duration);
    progressFill.style.width = `${(current / duration) * 100}%`;
  });

  audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    loadTrack(currentTrackIdx + 1, true);
  });

  // Enter click
  enterOverlay.addEventListener('click', () => {
    enterOverlay.classList.add('fade-out');
    loadTrack(0, true);
  });

  // Play / Pause
  btnPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      audio.play().catch(() => {});
      updatePlayButtonUI(true);
    } else {
      audio.pause();
      updatePlayButtonUI(false);
    }
  });

  btnNext.addEventListener('click', () => {
    loadTrack(currentTrackIdx + 1, true);
  });

  btnPrev.addEventListener('click', () => {
    loadTrack(currentTrackIdx - 1, true);
  });

  // Scrub bar
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration;
    }
  });

  // Mute toggle
  audioToggle.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
      iconVolume.classList.add('hidden');
      iconMuted.classList.remove('hidden');
    } else {
      iconVolume.classList.remove('hidden');
      iconMuted.classList.add('hidden');
    }
  });

  // Init first track title
  trackTitleEl.textContent = playlist[0].title;
  audio.src = encodeURI(playlist[0].file);

  /* --------------------------------------------------------------------------
     3. 3D Card Parallax Tilt Effect
     -------------------------------------------------------------------------- */
  const card = document.getElementById('tilt-card');
  const bgImage = document.querySelector('.bg-image');

  document.addEventListener('mousemove', (e) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2;
    const y = (e.clientY / innerHeight - 0.5) * 2;

    const tiltX = -y * 8;
    const tiltY = x * 8;

    card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
    if (bgImage) {
      bgImage.style.transform = `scale(1.04) translate(${-x * 8}px, ${-y * 8}px)`;
    }
  });

  document.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0)';
    if (bgImage) {
      bgImage.style.transform = 'scale(1.03) translate(0, 0)';
    }
  });

  /* --------------------------------------------------------------------------
     4. Persistent View Counter Simulation
     -------------------------------------------------------------------------- */
  const viewCountEl = document.getElementById('view-count');
  let views = parseInt(localStorage.getItem('hikaru_views') || '3', 10);
  views += 1;
  localStorage.setItem('hikaru_views', views.toString());
  viewCountEl.textContent = views;
})();
