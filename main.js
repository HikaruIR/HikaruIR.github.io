/**
 * Hikaru Aesthetic Profile - Modern Interactive Logic
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Ambient Canvas Particles (Silver Gothic Dust & Embers)
     -------------------------------------------------------------------------- */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 0.8;
      this.speedY = Math.random() * 0.45 + 0.15;
      this.speedX = (Math.random() - 0.5) * 0.35;
      this.opacity = Math.random() * 0.55 + 0.15;
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.pulse += this.pulseSpeed;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset(false);
      }
    }

    draw() {
      const currentOpacity = Math.max(0.08, this.opacity * Math.sin(this.pulse));
      ctx.save();
      ctx.fillStyle = `rgba(230, 235, 245, ${currentOpacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const particleCount = 42;
  const particles = Array.from({ length: particleCount }, () => new Particle());

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
    { title: "500 Miles", artist: "Peter, Paul & Mary", file: "musics/500-miles.mp3", fallback: "musics/500 Miles.mp3" },
    { title: "Summertime Sadness", artist: "Lana Del Rey", file: "musics/summertime-sadness.mp3" },
    { title: "Cigarettes out the Window", artist: "TV Girl", file: "musics/cigarettes.mp3" },
    { title: "Devil in Disguise", artist: "Marino", file: "musics/devil.mp3" },
    { title: "her", artist: "JVKE", file: "musics/her.mp3" },
    { title: "Stan", artist: "Eminem ft. Dido", file: "musics/stan.mp3" },
    { title: "Story of warrior", artist: "Epic Track", file: "musics/warrior.mp3" },
    { title: "Sweater Weather", artist: "The Neighbourhood", file: "musics/sweater-weather.m4a" }
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
  const playerBar = document.querySelector('.player-bar');

  // Playlist drawer elements
  const btnPlaylistToggle = document.getElementById('btn-playlist-toggle');
  const btnPlaylistClose = document.getElementById('btn-playlist-close');
  const playlistDrawer = document.getElementById('playlist-drawer');
  const playlistItemsList = document.getElementById('playlist-items');

  function renderPlaylist() {
    if (!playlistItemsList) return;
    playlistItemsList.innerHTML = '';
    playlist.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `playlist-item ${index === currentTrackIdx ? 'active' : ''}`;
      li.innerHTML = `
        <div class="playlist-item-left">
          <span class="playlist-track-num">${index + 1}</span>
          <span class="playlist-track-name">${item.title}</span>
        </div>
        <span class="playlist-track-artist">${item.artist}</span>
      `;
      li.addEventListener('click', () => {
        loadTrack(index, true);
        if (playlistDrawer) playlistDrawer.classList.add('hidden');
      });
      playlistItemsList.appendChild(li);
    });
  }

  function updatePlaylistActiveItem() {
    if (!playlistItemsList) return;
    const items = playlistItemsList.querySelectorAll('.playlist-item');
    items.forEach((item, idx) => {
      if (idx === currentTrackIdx) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  if (btnPlaylistToggle && playlistDrawer) {
    btnPlaylistToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      playlistDrawer.classList.toggle('hidden');
    });
  }

  if (btnPlaylistClose && playlistDrawer) {
    btnPlaylistClose.addEventListener('click', (e) => {
      e.stopPropagation();
      playlistDrawer.classList.add('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (playlistDrawer && !playlistDrawer.classList.contains('hidden')) {
      if (!playlistDrawer.contains(e.target) && e.target !== btnPlaylistToggle) {
        playlistDrawer.classList.add('hidden');
      }
    }
  });

  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function loadTrack(idx, autoPlay = true) {
    currentTrackIdx = (idx + playlist.length) % playlist.length;
    const track = playlist[currentTrackIdx];
    audio.src = track.file;
    audio.load();
    trackTitleEl.textContent = track.title;
    progressFill.style.width = '0%';
    currTimeEl.textContent = '0:00';
    updatePlaylistActiveItem();
    
    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          updatePlayButtonUI(true);
        }).catch((err) => {
          console.warn('Audio play auto-policy:', err);
          updatePlayButtonUI(false);
        });
      }
    }
  }

  // Audio fallback on error (e.g. if encoded url is needed)
  audio.addEventListener('error', () => {
    const track = playlist[currentTrackIdx];
    if (track && track.fallback && audio.src !== encodeURI(track.fallback)) {
      audio.src = encodeURI(track.fallback);
      audio.load();
      audio.play().catch(() => {});
    }
  });

  function updatePlayButtonUI(playing) {
    if (playing) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      if (playerBar) playerBar.classList.add('playing');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      if (playerBar) playerBar.classList.remove('playing');
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
  if (enterOverlay) {
    enterOverlay.addEventListener('click', () => {
      enterOverlay.classList.add('fade-out');
      loadTrack(0, true);
    });
  }

  // Play / Pause
  btnPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      audio.play().then(() => {
        updatePlayButtonUI(true);
      }).catch(() => {});
    } else {
      audio.pause();
      updatePlayButtonUI(false);
    }
  });

  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    loadTrack(currentTrackIdx + 1, true);
  });

  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
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

  // Volume Controls
  const volumeSlider = document.getElementById('volume-slider');
  const btnVolMute = document.getElementById('btn-vol-mute');
  const volIconHigh = document.getElementById('vol-icon-high');
  const volIconMuted = document.getElementById('vol-icon-muted');

  audio.volume = 0.75;

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      audio.volume = val;
      if (val === 0) {
        audio.muted = true;
        volIconHigh.classList.add('hidden');
        volIconMuted.classList.remove('hidden');
      } else {
        audio.muted = false;
        volIconHigh.classList.remove('hidden');
        volIconMuted.classList.add('hidden');
      }
    });
  }

  if (btnVolMute) {
    btnVolMute.addEventListener('click', () => {
      audio.muted = !audio.muted;
      if (audio.muted) {
        volIconHigh.classList.add('hidden');
        volIconMuted.classList.remove('hidden');
      } else {
        volIconHigh.classList.remove('hidden');
        volIconMuted.classList.add('hidden');
        if (audio.volume === 0) {
          audio.volume = 0.5;
          if (volumeSlider) volumeSlider.value = 0.5;
        }
      }
    });
  }

  // Mute toggle (top left button)
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      audio.muted = !audio.muted;
      if (audio.muted) {
        iconVolume.classList.add('hidden');
        iconMuted.classList.remove('hidden');
        if (volIconHigh) volIconHigh.classList.add('hidden');
        if (volIconMuted) volIconMuted.classList.remove('hidden');
      } else {
        iconVolume.classList.remove('hidden');
        iconMuted.classList.add('hidden');
        if (volIconHigh) volIconHigh.classList.remove('hidden');
        if (volIconMuted) volIconMuted.classList.add('hidden');
      }
    });
  }

  // Initialize track
  trackTitleEl.textContent = playlist[0].title;
  audio.src = playlist[0].file;
  renderPlaylist();

  /* --------------------------------------------------------------------------
     3. 3D Card Parallax Tilt Effect
     -------------------------------------------------------------------------- */
  const card = document.getElementById('tilt-card');
  const bgImage = document.querySelector('.bg-img');

  document.addEventListener('mousemove', (e) => {
    if (!card) return;
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2;
    const y = (e.clientY / innerHeight - 0.5) * 2;

    const tiltX = -y * 6;
    const tiltY = x * 6;

    card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
    if (bgImage) {
      bgImage.style.transform = `scale(1.04) translate(${-x * 8}px, ${-y * 8}px)`;
    }
  });

  document.addEventListener('mouseleave', () => {
    if (!card) return;
    card.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0)';
    if (bgImage) {
      bgImage.style.transform = 'scale(1.03) translate(0, 0)';
    }
  });

  /* --------------------------------------------------------------------------
     4. Persistent View Counter Simulation
     -------------------------------------------------------------------------- */
  const viewCountEl = document.getElementById('view-count');
  if (viewCountEl) {
    let views = parseInt(localStorage.getItem('hikaru_views') || '137', 10);
    views += 1;
    localStorage.setItem('hikaru_views', views.toString());
    viewCountEl.textContent = views;
  }
})();
