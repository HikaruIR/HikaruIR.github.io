/* ==========================================================================
   HIKARUIR - CYBERCORE SHOWCASE MAIN LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // 1. PLAYLIST & AUDIO SETUP
  // ---------------------------------------------------------------------------
  const playlist = [
    {
      title: 'Here With Me',
      artist: 'd4vd',
      src: 'assets/music/here_with_me.mp3',
      art: 'assets/images/song_d4vd.jpg'
    },
    {
      title: 'Story of Warrior',
      artist: 'Epic Cinematic',
      src: 'assets/music/story_of_warrior.mp3',
      art: 'assets/images/song_warrior.jpg'
    },
    {
      title: 'this is what winter feels like',
      artist: 'JVKE',
      src: 'assets/music/winter_feels_like.m4a',
      art: 'assets/images/song_jvke.jpg'
    }
  ];

  let currentTrackIdx = 0;
  let isPlaying = false;
  let isMuted = false;
  let previousVolume = 0.7;

  const audio = document.getElementById('audio-element');
  const playerArt = document.getElementById('player-art');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playPauseBtn = document.getElementById('play-pause');
  const playIcon = document.getElementById('play-icon');
  const prevTrackBtn = document.getElementById('prev-track');
  const nextTrackBtn = document.getElementById('next-track');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const currentTimeEl = document.getElementById('current-time');
  const totalDurationEl = document.getElementById('total-duration');
  const musicWidget = document.getElementById('music-widget');
  const volumeToggleBtn = document.getElementById('volume-toggle');
  const volumeIcon = document.getElementById('volume-icon');

  function loadTrack(idx) {
    currentTrackIdx = idx;
    const track = playlist[currentTrackIdx];
    audio.src = track.src;
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playerArt.src = track.art;
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';
  }

  function playTrack() {
    audio.play().then(() => {
      isPlaying = true;
      playIcon.classList.remove('fa-play');
      playIcon.classList.add('fa-pause');
      musicWidget.classList.add('playing');
    }).catch(err => {
      console.warn('Playback error / Autoplay blocked:', err);
    });
  }

  function pauseTrack() {
    audio.pause();
    isPlaying = false;
    playIcon.classList.remove('fa-pause');
    playIcon.classList.add('fa-play');
    musicWidget.classList.remove('playing');
  }

  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  });

  prevTrackBtn.addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIdx);
    if (isPlaying) playTrack();
  });

  nextTrackBtn.addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx + 1) % playlist.length;
    loadTrack(currentTrackIdx);
    if (isPlaying) playTrack();
  });

  audio.addEventListener('ended', () => {
    currentTrackIdx = (currentTrackIdx + 1) % playlist.length;
    loadTrack(currentTrackIdx);
    playTrack();
  });

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${pct}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    totalDurationEl.textContent = formatTime(audio.duration);
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * audio.duration;
    audio.currentTime = seekTime;
  });

  // Top Volume Toggle
  audio.volume = previousVolume;
  volumeToggleBtn.addEventListener('click', () => {
    if (isMuted) {
      audio.volume = previousVolume || 0.7;
      isMuted = false;
      volumeIcon.className = 'fa-solid fa-volume-high';
    } else {
      previousVolume = audio.volume;
      audio.volume = 0;
      isMuted = true;
      volumeIcon.className = 'fa-solid fa-volume-xmark';
    }
  });

  // Initialize First Track
  loadTrack(0);

  // ---------------------------------------------------------------------------
  // 2. ENTER SCREEN (CYBERCORE CLICK TO ENTER)
  // ---------------------------------------------------------------------------
  const enterScreen = document.getElementById('enter-screen');
  enterScreen.addEventListener('click', () => {
    enterScreen.classList.add('fade-out');
    playTrack();
    animateSkills();
    setTimeout(() => {
      enterScreen.remove();
    }, 900);
  });

  // ---------------------------------------------------------------------------
  // 3. TAB NAVIGATION & ANIMATIONS
  // ---------------------------------------------------------------------------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function animateSkills() {
    const progressBars = document.querySelectorAll('.skill-progress-bar');
    progressBars.forEach(bar => {
      const target = bar.style.getPropertyValue('--target-width') || '0%';
      bar.style.width = target;
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      if (targetId === 'skills-tab') {
        animateSkills();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. INTERACTIVE TERMINAL EMULATOR
  // ---------------------------------------------------------------------------
  const termInput = document.getElementById('term-input');
  const termBody = document.getElementById('terminal-body');
  const terminalCopyBtn = document.getElementById('terminal-copy');
  const termUptime = document.getElementById('term-uptime');

  // Dynamic uptime
  const startTime = Date.now();
  setInterval(() => {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    termUptime.textContent = `${mins}m ${secs}s (active session)`;
  }, 1000);

  const commandHistory = [];
  let historyIdx = -1;

  const terminalCommands = {
    help: () => `Available commands:
  • help       - Show this command reference
  • whoami     - Display identity and info
  • skills     - Show all mastered software & languages
  • music      - Show current track & playlist
  • games      - List favorite gaming titles
  • anime      - List favorite anime series
  • crushes    - List anime crushes
  • contact    - Display social links
  • date       - Show current timestamp
  • clear      - Clear terminal screen`,
    
    whoami: () => `Identity: HikaruIR
Name: Mohammad
Age: 15 years old
Role: Video Editor, Developer, Cybercore Enthusiast
Location: Cyberspace
Philosophy: "Precision in editing, elegance in code."`,

    skills: () => `Proficiency Breakdown:
  [Photoshop]      97% | Graphics, Composites, Cybercore
  [Premiere Pro]   89% | Montage, Sound Design, Cuts
  [Java]           80% | Algorithms, Systems, OOP
  [After Effects]  76% | AMV, VFX, Transitions, Motion
  [JavaScript]     67% | Web Interactivity, UI, DOM
  [Python]         45% | Bots, Utilities, Scripts
  [CSS3]           23% | Modern Styling, Flex/Grid`,

    music: () => `Now Playing: "${playlist[currentTrackIdx].title}" by ${playlist[currentTrackIdx].artist}
Playlist Tracks:
  1. d4vd - Here With Me
  2. Epic - Story of Warrior
  3. JVKE - this is what winter feels like`,

    games: () => `Favorite Games:
  1. Counter-Strike 2 (Competitive FPS)
  2. Red Dead Redemption 2 (Masterpiece Story)
  3. Minecraft (Creative Sandbox)
  4. Need for Speed Unbound (Street Racing)
  5. Far Cry 5 (Action Adventure)
  6. Ghost of Tsushima (Samurai Journey)`,

    anime: () => `Top Anime:
  1. The Fragrant Flower Blooms with Dignity (Kaoru Hana)
  2. Alya Sometimes Hides Her Feelings in Russian (Roshidere)
  3. Demon Slayer (Kimetsu no Yaiba)
  4. Attack on Titan (Shingeki no Kyojin)`,

    crushes: () => `Anime Crushes (S-Tier):
  • Masha Kujou (Mariya) - Alya Sometimes Hides Her Feelings in Russian
  • Kaoruko Waguri - The Fragrant Flower Blooms with Dignity`,

    contact: () => `Connect:
  • Discord : https://discord.gg/RgrXHQayCG
  • GitHub  : https://github.com/HikaruIR
  • YouTube : https://www.youtube.com/@Mamad214-11`,

    date: () => new Date().toUTCString(),

    clear: () => {
      const promptLine = termBody.querySelector('.prompt-line');
      const termOutput = document.getElementById('term-output');
      termOutput.innerHTML = '';
      return '';
    }
  };

  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmdRaw = termInput.value.trim();
      if (!cmdRaw) return;

      commandHistory.push(cmdRaw);
      historyIdx = commandHistory.length;

      const cmd = cmdRaw.toLowerCase();
      termInput.value = '';

      // Print prompt and command
      const cmdLine = document.createElement('div');
      cmdLine.className = 'term-line prompt-line';
      cmdLine.innerHTML = `<span class="term-prompt">guest@hikaru:~$</span> <span class="term-cmd">${escapeHtml(cmdRaw)}</span>`;
      
      const interactiveRow = termBody.querySelector('.term-interactive-line');
      termBody.insertBefore(cmdLine, interactiveRow);

      // Execute command
      if (cmd === 'clear') {
        terminalCommands.clear();
      } else {
        const outDiv = document.createElement('div');
        outDiv.className = 'term-line';
        outDiv.style.color = '#cbd5e1';
        outDiv.style.whiteSpace = 'pre-wrap';
        outDiv.style.marginBottom = '12px';

        if (terminalCommands[cmd]) {
          outDiv.textContent = terminalCommands[cmd]();
        } else if (cmd.startsWith('echo ')) {
          outDiv.textContent = cmdRaw.substring(5);
        } else {
          outDiv.innerHTML = `<span style="color:#ff5f56;">command not found: ${escapeHtml(cmdRaw)}. Type <span style="color:var(--accent-cyan);">'help'</span> for list of commands.</span>`;
        }
        termBody.insertBefore(outDiv, interactiveRow);
      }

      termBody.scrollTop = termBody.scrollHeight;
    } else if (e.key === 'ArrowUp') {
      if (historyIdx > 0) {
        historyIdx--;
        termInput.value = commandHistory[historyIdx];
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIdx < commandHistory.length - 1) {
        historyIdx++;
        termInput.value = commandHistory[historyIdx];
      } else {
        historyIdx = commandHistory.length;
        termInput.value = '';
      }
    }
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Copy Terminal Output
  terminalCopyBtn.addEventListener('click', () => {
    const textToCopy = termBody.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      terminalCopyBtn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--accent-green);"></i>';
      setTimeout(() => {
        terminalCopyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
      }, 1800);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CRT SCANLINE TOGGLE & TOP CLOCK
  // ---------------------------------------------------------------------------
  const scanlineToggle = document.getElementById('scanline-toggle');
  const scanlines = document.querySelector('.scanlines');
  scanlineToggle.addEventListener('click', () => {
    scanlines.classList.toggle('disabled');
  });

  const sysClock = document.getElementById('sys-clock');
  function updateClock() {
    const now = new Date();
    const utcStr = now.toISOString().substring(11, 19) + ' UTC';
    sysClock.textContent = utcStr;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ---------------------------------------------------------------------------
  // 6. CURSOR GLOW EFFECT & CARD 3D TILT
  // ---------------------------------------------------------------------------
  const cursorGlow = document.getElementById('cursor-glow');
  const profileCard = document.getElementById('profile-card');

  window.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;

    // 3D Tilt on card
    if (window.innerWidth > 900) {
      const rect = profileCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const isInside = (
        e.clientX >= rect.left - 40 &&
        e.clientX <= rect.right + 40 &&
        e.clientY >= rect.top - 40 &&
        e.clientY <= rect.bottom + 40
      );

      if (isInside) {
        const rotateX = -(y / rect.height) * 3;
        const rotateY = (x / rect.width) * 3;
        profileCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      } else {
        profileCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 7. PARTICLES BACKGROUND CANVAS
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -Math.random() * 0.5 - 0.2;
      this.radius = Math.random() * 2 + 0.8;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.color = Math.random() > 0.5 ? '#bfdbfe' : '#93c5fd';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
        this.y = height + 10;
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(renderParticles);
  }
  renderParticles();

});
