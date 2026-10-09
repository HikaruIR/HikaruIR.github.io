/**
 * Hikaru Bio Link / Info Page Logic
 * - Falling monochrome leaf/petal particle engine
 * - Web Audio API Lo-Fi ambient synth track (zero external audio dependency)
 * - Play/Pause/Seek controls & simulated live view counter
 * - 3D Card Parallax Tilt effect
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

      // Stylized Japanese Maple leaf silhouette
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
     2. Web Audio API Ambient Lo-Fi Synthesizer (No external asset needed)
     -------------------------------------------------------------------------- */
  let audioCtx = null;
  let isPlaying = false;
  let isMuted = false;
  let synthInterval = null;

  function initAudioEngine() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
  }

  // Harmonic dark ambient minor chord sequence
  const ambientNotes = [
    [130.81, 155.56, 196.00, 246.94], // C Minor 7
    [116.54, 146.83, 174.61, 220.00], // Bb Major
    [103.83, 130.81, 155.56, 196.00], // Ab Major 7
    [123.47, 146.83, 185.00, 220.00]  // G Minor 7
  ];
  let chordIndex = 0;

  function playAmbientPad() {
    if (!audioCtx || audioCtx.state === 'suspended' || isMuted) return;

    const chord = ambientNotes[chordIndex % ambientNotes.length];
    chordIndex++;

    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.08, now + 2.5);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 5.8);

    // Warm Low-pass filter
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 2.5);
    filter.frequency.exponentialRampToValueAtTime(450, now + 5.5);

    masterGain.connect(filter);
    filter.connect(audioCtx.destination);

    chord.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 6.0);
    });
  }

  function startAmbientMusic() {
    if (!isPlaying) {
      isPlaying = true;
      initAudioEngine();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      playAmbientPad();
      synthInterval = setInterval(playAmbientPad, 5000);
      updatePlayButtonUI(true);
    }
  }

  function stopAmbientMusic() {
    isPlaying = false;
    if (synthInterval) clearInterval(synthInterval);
    updatePlayButtonUI(false);
  }

  /* --------------------------------------------------------------------------
     3. Audio Controls & Timeline Simulation
     -------------------------------------------------------------------------- */
  const enterOverlay = document.getElementById('enter-overlay');
  const btnPlay = document.getElementById('btn-play');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const audioToggle = document.getElementById('audio-toggle');
  const iconVolume = document.getElementById('icon-volume');
  const iconMuted = document.getElementById('icon-muted');
  const currTimeEl = document.getElementById('curr-time');
  const progressFill = document.getElementById('progress-fill');
  const progressContainer = document.getElementById('progress-container');

  let currentSeconds = 15;
  const totalSeconds = 185; // 3:05

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateTimeline() {
    if (isPlaying) {
      currentSeconds += 1;
      if (currentSeconds > totalSeconds) currentSeconds = 0;
      currTimeEl.textContent = formatTime(currentSeconds);
      progressFill.style.width = `${(currentSeconds / totalSeconds) * 100}%`;
    }
  }
  setInterval(updateTimeline, 1000);

  function updatePlayButtonUI(playing) {
    if (playing) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }

  // Click to Enter Handler
  enterOverlay.addEventListener('click', () => {
    enterOverlay.classList.add('fade-out');
    startAmbientMusic();
  });

  // Play / Pause toggle
  btnPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAmbientMusic();
    } else {
      startAmbientMusic();
    }
  });

  // Top Left Mute Toggle
  audioToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
      iconVolume.classList.add('hidden');
      iconMuted.classList.remove('hidden');
      if (audioCtx) audioCtx.suspend();
    } else {
      iconVolume.classList.remove('hidden');
      iconMuted.classList.add('hidden');
      if (audioCtx) audioCtx.resume();
      if (!isPlaying) startAmbientMusic();
    }
  });

  // Scrubbing on progress bar
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    currentSeconds = Math.floor(ratio * totalSeconds);
    currTimeEl.textContent = formatTime(currentSeconds);
    progressFill.style.width = `${ratio * 100}%`;
  });

  /* --------------------------------------------------------------------------
     4. 3D Card Parallax Tilt Effect
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
    bgImage.style.transform = `scale(1.04) translate(${-x * 8}px, ${-y * 8}px)`;
  });

  document.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0)';
    bgImage.style.transform = 'scale(1.03) translate(0, 0)';
  });

  /* --------------------------------------------------------------------------
     5. Persistent View Counter Simulation
     -------------------------------------------------------------------------- */
  const viewCountEl = document.getElementById('view-count');
  let views = parseInt(localStorage.getItem('hikaru_views') || '3', 10);
  views += 1;
  localStorage.setItem('hikaru_views', views.toString());
  viewCountEl.textContent = views;
})();
