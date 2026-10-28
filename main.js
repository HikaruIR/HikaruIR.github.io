/**
 * Hikaru - Personal Terminal & Profile Engine
 * Static, Zero-Dependency, Pure Vanilla JS
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. DATA & STATE DEFINITIONS
  // ==========================================================================

  // Verified playlist from local files
  const PLAYLIST = [
    {
      id: 1,
      title: "Bad Zaat",
      artist: "Official Lyric Video",
      file: "Music/Bad Zaat (Official lyric Video).m4a"
    },
    {
      id: 2,
      title: "Faze Love",
      artist: "Aslikid Matv1n",
      file: "Music/Faze Love   Aslikid Matv1n.m4a"
    },
    {
      id: 3,
      title: "Iran Tasliat",
      artist: "Big Shaggy",
      file: "Music/Iran Tasliat   Big Shaggy.m4a"
    },
    {
      id: 4,
      title: "Ma Yademoon Nmire",
      artist: "Track",
      file: "Music/Ma Yademoon Nmire - .mp3"
    },
    {
      id: 5,
      title: "3AM",
      artist: "Sajad Shahi",
      file: "Music/Sajad Shahi - 3AM (Official Visualiser)   None.mp3"
    }
  ];

  // Verified Socials (Strictly GitHub, Telegram, Discord)
  const SOCIALS = [
    { name: "GitHub", url: "https://github.com/HikaruIR", handle: "github.com/HikaruIR" },
    { name: "Telegram", url: "https://t.me/hikaru_mp4", handle: "t.me/hikaru_mp4" },
    { name: "Discord", url: "https://discord.gg/ZztbZfDGD", handle: "discord.gg/ZztbZfDGD" }
  ];

  // Core App State
  const state = {
    currentView: 'intro', // 'intro' | 'profile'
    bootComplete: false,
    audioInitialized: false,
    isPlaying: false,
    currentTrackIndex: 0,
    isShuffle: false,
    repeatMode: 'all', // 'all' | 'one' | 'off'
    volume: 0.75,
    isMuted: false,
    playedHistory: [],
    commandHistory: [],
    historyIndex: -1,
    dockedCommandHistory: [],
    dockedHistoryIndex: -1
  };

  // ==========================================================================
  // 2. DOM ELEMENT REFERENCES
  // ==========================================================================
  const dom = {
    // Views
    introView: document.getElementById('terminal-intro-view'),
    profileView: document.getElementById('profile-view'),
    quickViewToggle: document.getElementById('quick-view-toggle'),
    quickMuteToggle: document.getElementById('quick-mute-toggle'),
    
    // Intro Terminal
    introInput: document.getElementById('intro-terminal-input'),
    introVirtualInput: document.getElementById('intro-virtual-input'),
    bootLogs: document.getElementById('boot-logs'),
    commandOutputs: document.getElementById('command-outputs'),
    introTerminalBody: document.getElementById('intro-terminal-body'),
    cmdPills: document.querySelectorAll('.cmd-pill'),

    // Docked Terminal
    dockedInput: document.getElementById('docked-terminal-input'),
    dockedVirtualInput: document.getElementById('docked-virtual-input'),
    dockedLogs: document.getElementById('docked-logs'),
    dockedTerminalBody: document.getElementById('docked-terminal-body'),
    btnClearDocked: document.getElementById('btn-clear-docked'),
    statAudioStatus: document.getElementById('stat-audio-status'),

    // Card Actions
    btnCardTerminalFocus: document.getElementById('btn-card-terminal-focus'),
    btnCardExit: document.getElementById('btn-card-exit'),

    // Audio Engine Elements
    audioElement: document.getElementById('core-audio-player'),
    cardPlayerPanel: document.getElementById('card-music-player'),
    trackTitle: document.getElementById('player-track-title'),
    trackArtist: document.getElementById('player-track-artist'),
    trackCounter: document.getElementById('track-counter'),
    currentTime: document.getElementById('current-time'),
    totalDuration: document.getElementById('total-duration'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnRepeat: document.getElementById('btn-repeat'),
    repeatOneBadge: document.querySelector('.repeat-one-indicator'),
    volumeSlider: document.getElementById('volume-slider'),
    btnVolumeIcon: document.getElementById('btn-volume-icon'),
    btnPlaylistToggle: document.getElementById('btn-playlist-toggle'),
    playlistDrawer: document.getElementById('playlist-drawer'),
    playlistItemsList: document.getElementById('playlist-items-list'),

    // Autoplay Modal
    autoplayModal: document.getElementById('autoplay-modal'),
    btnEnableAudio: document.getElementById('btn-enable-audio'),

    // Canvas
    snowCanvas: document.getElementById('snow-canvas')
  };

  // ==========================================================================
  // 3. AUDIO ENGINE IMPLEMENTATION
  // ==========================================================================

  function initAudioEngine() {
    // Select random initial song (avoiding repeating the previous session song if possible)
    let lastSavedIdx = parseInt(localStorage.getItem('hikaru_last_track_index'), 10);
    let initialIdx = 0;

    if (!isNaN(lastSavedIdx) && PLAYLIST.length > 1) {
      let candidates = [];
      for (let i = 0; i < PLAYLIST.length; i++) {
        if (i !== lastSavedIdx) candidates.push(i);
      }
      initialIdx = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      initialIdx = Math.floor(Math.random() * PLAYLIST.length);
    }

    state.currentTrackIndex = initialIdx;
    localStorage.setItem('hikaru_last_track_index', initialIdx.toString());

    // Restore saved volume
    const savedVol = localStorage.getItem('hikaru_volume');
    if (savedVol !== null) {
      state.volume = parseFloat(savedVol);
      if (dom.volumeSlider) dom.volumeSlider.value = state.volume;
    }
    dom.audioElement.volume = state.volume;

    // Load track metadata into UI
    loadTrack(state.currentTrackIndex, false);
    renderPlaylistDrawer();

    // Audio event listeners
    dom.audioElement.addEventListener('timeupdate', onTimeUpdate);
    dom.audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
    dom.audioElement.addEventListener('ended', onTrackEnded);
    dom.audioElement.addEventListener('play', () => setPlaybackUI(true));
    dom.audioElement.addEventListener('pause', () => setPlaybackUI(false));
    dom.audioElement.addEventListener('error', onAudioError);

    // Audio controls
    if (dom.btnPlayPause) dom.btnPlayPause.addEventListener('click', togglePlayPause);
    if (dom.btnPrev) dom.btnPrev.addEventListener('click', playPreviousTrack);
    if (dom.btnNext) dom.btnNext.addEventListener('click', playNextTrack);
    if (dom.btnShuffle) dom.btnShuffle.addEventListener('click', toggleShuffle);
    if (dom.btnRepeat) dom.btnRepeat.addEventListener('click', toggleRepeat);

    // Progress Bar Scrubbing
    if (dom.progressContainer) {
      dom.progressContainer.addEventListener('click', seekAudio);
    }

    // Volume Slider & Mute
    if (dom.volumeSlider) {
      dom.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
      });
    }

    if (dom.btnVolumeIcon) {
      dom.btnVolumeIcon.addEventListener('click', toggleMute);
    }
    if (dom.quickMuteToggle) {
      dom.quickMuteToggle.addEventListener('click', toggleMute);
    }

    // Playlist Drawer Toggle
    if (dom.btnPlaylistToggle) {
      dom.btnPlaylistToggle.addEventListener('click', () => {
        dom.playlistDrawer.classList.toggle('hidden');
      });
    }

    // Autoplay fallback button
    if (dom.btnEnableAudio) {
      dom.btnEnableAudio.addEventListener('click', () => {
        dom.autoplayModal.classList.add('hidden');
        playAudio();
      });
    }
  }

  function loadTrack(index, autoplay = true) {
    if (index < 0 || index >= PLAYLIST.length) index = 0;
    state.currentTrackIndex = index;
    localStorage.setItem('hikaru_last_track_index', index.toString());

    const track = PLAYLIST[index];
    dom.audioElement.src = encodeURI(track.file);

    // Update UI labels
    if (dom.trackTitle) dom.trackTitle.textContent = track.title;
    if (dom.trackArtist) dom.trackArtist.textContent = track.artist;
    if (dom.trackCounter) {
      dom.trackCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(PLAYLIST.length).padStart(2, '0')}`;
    }

    // Update playlist active state
    updatePlaylistActiveItem();

    if (autoplay) {
      playAudio();
    }
  }

  function playAudio() {
    const playPromise = dom.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          state.isPlaying = true;
          setPlaybackUI(true);
        })
        .catch((err) => {
          console.warn('Autoplay restricted by browser policy:', err);
          state.isPlaying = false;
          setPlaybackUI(false);
          // Show non-intrusive prompt if triggered by user start
          if (state.currentView === 'profile') {
            dom.autoplayModal.classList.remove('hidden');
          }
        });
    }
  }

  function pauseAudio() {
    dom.audioElement.pause();
    state.isPlaying = false;
    setPlaybackUI(false);
  }

  function togglePlayPause() {
    if (dom.audioElement.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  }

  function playNextTrack() {
    let nextIdx;
    if (state.isShuffle) {
      // Pick random different track
      let available = [];
      for (let i = 0; i < PLAYLIST.length; i++) {
        if (i !== state.currentTrackIndex) available.push(i);
      }
      nextIdx = available[Math.floor(Math.random() * available.length)];
    } else {
      nextIdx = (state.currentTrackIndex + 1) % PLAYLIST.length;
    }
    loadTrack(nextIdx, true);
  }

  function playPreviousTrack() {
    // If more than 3 seconds in, restart track
    if (dom.audioElement.currentTime > 3) {
      dom.audioElement.currentTime = 0;
      return;
    }

    let prevIdx;
    if (state.isShuffle) {
      let available = [];
      for (let i = 0; i < PLAYLIST.length; i++) {
        if (i !== state.currentTrackIndex) available.push(i);
      }
      prevIdx = available[Math.floor(Math.random() * available.length)];
    } else {
      prevIdx = (state.currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    }
    loadTrack(prevIdx, true);
  }

  function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    if (dom.btnShuffle) {
      dom.btnShuffle.classList.toggle('active-state', state.isShuffle);
    }
  }

  function toggleRepeat() {
    if (state.repeatMode === 'all') {
      state.repeatMode = 'one';
      dom.btnRepeat.classList.add('active-state');
      dom.repeatOneBadge.classList.remove('hidden');
    } else if (state.repeatMode === 'one') {
      state.repeatMode = 'off';
      dom.btnRepeat.classList.remove('active-state');
      dom.repeatOneBadge.classList.add('hidden');
    } else {
      state.repeatMode = 'all';
      dom.btnRepeat.classList.add('active-state');
      dom.repeatOneBadge.classList.add('hidden');
    }
  }

  function onTrackEnded() {
    if (state.repeatMode === 'one') {
      dom.audioElement.currentTime = 0;
      playAudio();
    } else if (state.repeatMode === 'all') {
      playNextTrack();
    } else {
      // 'off': Stop at end of playlist
      if (state.currentTrackIndex < PLAYLIST.length - 1) {
        playNextTrack();
      } else {
        pauseAudio();
      }
    }
  }

  function setVolume(val) {
    state.volume = Math.max(0, Math.min(1, val));
    dom.audioElement.volume = state.volume;
    dom.audioElement.muted = false;
    state.isMuted = false;
    localStorage.setItem('hikaru_volume', state.volume.toString());
    updateVolumeUI();
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    dom.audioElement.muted = state.isMuted;
    updateVolumeUI();
  }

  function updateVolumeUI() {
    const isSilenced = state.isMuted || dom.audioElement.volume === 0;
    if (dom.quickMuteToggle) {
      dom.quickMuteToggle.classList.toggle('vol-muted', isSilenced);
    }
    if (dom.btnVolumeIcon) {
      dom.btnVolumeIcon.style.opacity = isSilenced ? '0.4' : '1';
    }
  }

  function onTimeUpdate() {
    const cur = dom.audioElement.currentTime || 0;
    const dur = dom.audioElement.duration || 0;

    if (dom.currentTime) dom.currentTime.textContent = formatTime(cur);

    if (dur > 0 && dom.progressFill) {
      const pct = (cur / dur) * 100;
      dom.progressFill.style.width = `${pct}%`;
      dom.progressContainer.setAttribute('aria-valuenow', Math.round(pct).toString());
    }
  }

  function onLoadedMetadata() {
    const dur = dom.audioElement.duration || 0;
    if (dom.totalDuration) dom.totalDuration.textContent = formatTime(dur);
  }

  function seekAudio(e) {
    const rect = dom.progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const dur = dom.audioElement.duration || 0;

    if (width > 0 && dur > 0) {
      const targetTime = (clickX / width) * dur;
      dom.audioElement.currentTime = Math.max(0, Math.min(dur, targetTime));
    }
  }

  function onAudioError(e) {
    console.error('Audio load error:', e);
    if (dom.trackArtist) dom.trackArtist.textContent = "[Error loading audio file]";
    if (dom.statAudioStatus) dom.statAudioStatus.textContent = "ERR_LOAD";
  }

  function setPlaybackUI(playing) {
    state.isPlaying = playing;
    if (dom.iconPlay && dom.iconPause) {
      dom.iconPlay.classList.toggle('hidden', playing);
      dom.iconPause.classList.toggle('hidden', !playing);
    }
    if (dom.cardPlayerPanel) {
      dom.cardPlayerPanel.classList.toggle('is-playing', playing);
    }
    if (dom.statAudioStatus) {
      dom.statAudioStatus.textContent = playing ? "STREAMING" : "PAUSED";
      dom.statAudioStatus.className = playing ? "stat-val stat-green" : "stat-val stat-val-audio";
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderPlaylistDrawer() {
    if (!dom.playlistItemsList) return;
    dom.playlistItemsList.innerHTML = '';

    PLAYLIST.forEach((track, idx) => {
      const li = document.createElement('li');
      li.className = 'playlist-item' + (idx === state.currentTrackIndex ? ' active' : '');
      li.dataset.index = idx.toString();

      li.innerHTML = `
        <span class="pl-index">${String(idx + 1).padStart(2, '0')}</span>
        <span class="pl-title">${track.title}</span>
        ${idx === state.currentTrackIndex ? '<span class="pl-playing-dot"></span>' : ''}
      `;

      li.addEventListener('click', () => {
        loadTrack(idx, true);
        dom.playlistDrawer.classList.add('hidden');
      });

      dom.playlistItemsList.appendChild(li);
    });
  }

  function updatePlaylistActiveItem() {
    if (!dom.playlistItemsList) return;
    const items = dom.playlistItemsList.querySelectorAll('.playlist-item');
    items.forEach((item, idx) => {
      const isActive = idx === state.currentTrackIndex;
      item.classList.toggle('active', isActive);
      const dot = item.querySelector('.pl-playing-dot');
      if (isActive && !dot) {
        const newDot = document.createElement('span');
        newDot.className = 'pl-playing-dot';
        item.appendChild(newDot);
      } else if (!isActive && dot) {
        dot.remove();
      }
    });
  }

  // ==========================================================================
  // 4. TERMINAL ENGINE & BOOT SEQUENCE
  // ==========================================================================

  const BOOT_STEPS = [
    { text: "Initializing system...", delay: 200, status: "OK" },
    { text: "Loading profile assets...", delay: 500, status: "OK" },
    { text: "Preparing interface...", delay: 850, status: "OK" },
    { text: "System ready.", delay: 1200, status: "READY" }
  ];

  function runBootSequence() {
    if (!dom.bootLogs) return;

    BOOT_STEPS.forEach((step) => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = 'boot-line';

        const now = new Date();
        const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;

        line.innerHTML = `
          <span class="timestamp">${timeStr}</span>
          <span>${step.text}</span>
          <span class="success">[${step.status}]</span>
        `;
        dom.bootLogs.appendChild(line);
        scrollToBottom(dom.introTerminalBody);
      }, step.delay);
    });

    setTimeout(() => {
      state.bootComplete = true;
      const hint = document.createElement('div');
      hint.className = 'boot-line';
      hint.innerHTML = `<span style="color: #3F8F65; font-weight: 500;">&gt;&gt; Ready. Type <span style="text-decoration: underline; color: #fff;">start</span> to open profile, or <span style="text-decoration: underline; color: #fff;">help</span> for commands.</span>`;
      dom.bootLogs.appendChild(hint);

      scrollToBottom(dom.introTerminalBody);
      if (dom.introInput) dom.introInput.focus();
    }, 1500);
  }

  function handleTerminalInput(rawCmd, source) {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Track command history
    state.commandHistory.push(cmd);
    state.historyIndex = state.commandHistory.length;

    // Record into intro output container
    appendCommandHistoryRecord(cmd, source);

    // Process command dispatch
    executeCommand(cmd.toLowerCase(), source);

    // Clear input values
    if (source === 'intro') {
      dom.introInput.value = '';
      dom.introVirtualInput.textContent = '';
      scrollToBottom(dom.introTerminalBody);
    } else {
      dom.dockedInput.value = '';
      dom.dockedVirtualInput.textContent = '';
      scrollToBottom(dom.dockedTerminalBody);
    }
  }

  function appendCommandHistoryRecord(cmd, source) {
    const entry = document.createElement('div');
    entry.className = 'cmd-history-entry';

    const inv = document.createElement('div');
    inv.className = 'cmd-invoked';
    inv.innerHTML = `<span class="prompt-accent">&gt;</span> <span>${escapeHtml(cmd)}</span>`;
    entry.appendChild(inv);

    const out = document.createElement('div');
    out.className = 'cmd-output-content';
    entry.appendChild(out);

    if (source === 'intro' && dom.commandOutputs) {
      dom.commandOutputs.appendChild(entry);
    } else if (dom.dockedLogs) {
      dom.dockedLogs.appendChild(entry);
    }

    // Return output container for command to populate
    return out;
  }

  function executeCommand(cmd, source) {
    const targetContainer = source === 'intro' 
      ? dom.commandOutputs.lastElementChild?.querySelector('.cmd-output-content')
      : dom.dockedLogs.lastElementChild?.querySelector('.cmd-output-content');

    switch (cmd) {
      case 'start':
        if (targetContainer) {
          targetContainer.innerHTML = `<p class="txt-accent">&gt; Launching Hikaru profile workspace...</p>`;
        }
        setTimeout(() => {
          switchToView('profile');
          // Autoplay music upon executing 'start'
          playAudio();
        }, 300);
        break;

      case 'help':
        if (targetContainer) {
          targetContainer.innerHTML = `
            <div class="cmd-output-table">
              <span class="cmd-key">start</span><span class="cmd-val">Open Hikaru's personal profile view</span>
              <span class="cmd-key">about</span><span class="cmd-val">Display biography & identity</span>
              <span class="cmd-key">socials</span><span class="cmd-val">View verified social media connects</span>
              <span class="cmd-key">links</span><span class="cmd-val">View direct personal channels</span>
              <span class="cmd-key">music</span><span class="cmd-val">Show audio player status & tracklist</span>
              <span class="cmd-key">clear</span><span class="cmd-val">Clear terminal logs</span>
              <span class="cmd-key">exit</span><span class="cmd-val">Return to initial boot terminal</span>
              <span class="cmd-key">help</span><span class="cmd-val">Print this manual</span>
            </div>
          `;
        }
        break;

      case 'about':
        if (targetContainer) {
          targetContainer.innerHTML = `
            <p><strong>Hikaru</strong> &mdash; <em>&ldquo;Eyes on my target&rdquo;</em></p>
            <p style="color: var(--text-gray); font-size: 12px; margin-top: 4px;">
              System: HikaruOS v2.4.0 (x86_64) | Role: Developer & Minimalist<br/>
              Type <strong class="cmd-key">start</strong> to mount full graphic interface.
            </p>
          `;
        }
        break;

      case 'socials':
      case 'links':
        if (targetContainer) {
          let linksHtml = `<div class="cmd-output-table">`;
          SOCIALS.forEach((item) => {
            linksHtml += `
              <span class="cmd-key">[${item.name}]</span>
              <span class="cmd-val"><a class="cmd-link" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url} &nearr;</a></span>
            `;
          });
          linksHtml += `</div>`;
          targetContainer.innerHTML = linksHtml;
        }
        break;

      case 'music':
        const curTrack = PLAYLIST[state.currentTrackIndex];
        if (targetContainer) {
          targetContainer.innerHTML = `
            <p><span class="cmd-key">NOW PLAYING:</span> ${curTrack.title} &mdash; ${curTrack.artist}</p>
            <p style="color: var(--text-gray); font-size: 11.5px; margin-top: 3px;">
              Status: ${state.isPlaying ? 'STREAMING' : 'PAUSED'} | Tracks Loaded: ${PLAYLIST.length} | Volume: ${Math.round(state.volume * 100)}%
            </p>
          `;
        }
        break;

      case 'clear':
        if (source === 'intro') {
          if (dom.commandOutputs) dom.commandOutputs.innerHTML = '';
          if (dom.bootLogs) dom.bootLogs.innerHTML = '';
        } else {
          if (dom.dockedLogs) dom.dockedLogs.innerHTML = '';
        }
        break;

      case 'exit':
        if (targetContainer) {
          targetContainer.innerHTML = `<p style="color: #ff7676;">&gt; Session detached. Returning to boot sequence...</p>`;
        }
        setTimeout(() => {
          switchToView('intro');
        }, 350);
        break;

      default:
        if (targetContainer) {
          targetContainer.innerHTML = `
            <p class="cmd-error">bash: command not found: &lsquo;${escapeHtml(cmd)}&rsquo;.</p>
            <p style="color: var(--text-muted); font-size: 11.5px;">Type <strong class="cmd-key">help</strong> for a list of valid commands or <strong class="cmd-key">start</strong> to proceed.</p>
          `;
        }
        break;
    }

    if (source === 'intro') {
      scrollToBottom(dom.introTerminalBody);
    } else {
      scrollToBottom(dom.dockedTerminalBody);
    }
  }

  // ==========================================================================
  // 5. VIEW NAVIGATION & INTERACTION
  // ==========================================================================

  function switchToView(viewName) {
    if (viewName === 'profile') {
      state.currentView = 'profile';
      dom.introView.classList.remove('active');
      dom.profileView.classList.add('active');
      if (dom.quickViewToggle) {
        dom.quickViewToggle.querySelector('.hdr-btn-label').textContent = 'Intro';
      }
      setTimeout(() => {
        if (dom.dockedInput) dom.dockedInput.focus();
      }, 200);
    } else {
      state.currentView = 'intro';
      dom.profileView.classList.remove('active');
      dom.introView.classList.add('active');
      if (dom.quickViewToggle) {
        dom.quickViewToggle.querySelector('.hdr-btn-label').textContent = 'Profile';
      }
      setTimeout(() => {
        if (dom.introInput) dom.introInput.focus();
      }, 200);
    }
  }

  function setupEventListeners() {
    // Top Bar View Toggle
    if (dom.quickViewToggle) {
      dom.quickViewToggle.addEventListener('click', () => {
        switchToView(state.currentView === 'intro' ? 'profile' : 'intro');
      });
    }

    // Card Action: Open/Focus Docked Terminal
    if (dom.btnCardTerminalFocus) {
      dom.btnCardTerminalFocus.addEventListener('click', () => {
        if (dom.dockedInput) {
          dom.dockedInput.focus();
          dom.dockedInput.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Card Action: Exit
    if (dom.btnCardExit) {
      dom.btnCardExit.addEventListener('click', () => {
        switchToView('intro');
      });
    }

    // Clear Docked Terminal Button
    if (dom.btnClearDocked) {
      dom.btnClearDocked.addEventListener('click', () => {
        if (dom.dockedLogs) dom.dockedLogs.innerHTML = '';
      });
    }

    // Quick Command Pills
    dom.cmdPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const cmd = pill.dataset.cmd;
        if (cmd) {
          handleTerminalInput(cmd, 'intro');
        }
      });
    });

    // Intro Terminal Real Input Synchronization
    if (dom.introInput) {
      dom.introInput.addEventListener('input', (e) => {
        dom.introVirtualInput.textContent = e.target.value;
      });

      dom.introInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTerminalInput(dom.introInput.value, 'intro');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateHistory('intro', -1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateHistory('intro', 1);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          autocompleteCommand(dom.introInput, dom.introVirtualInput);
        }
      });

      // Keep focus when clicking terminal body
      if (dom.introTerminalBody) {
        dom.introTerminalBody.addEventListener('click', () => {
          dom.introInput.focus();
        });
      }
    }

    // Docked Terminal Real Input Synchronization
    if (dom.dockedInput) {
      dom.dockedInput.addEventListener('input', (e) => {
        dom.dockedVirtualInput.textContent = e.target.value;
      });

      dom.dockedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTerminalInput(dom.dockedInput.value, 'docked');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateHistory('docked', -1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateHistory('docked', 1);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          autocompleteCommand(dom.dockedInput, dom.dockedVirtualInput);
        }
      });

      if (dom.dockedTerminalBody) {
        dom.dockedTerminalBody.addEventListener('click', () => {
          dom.dockedInput.focus();
        });
      }
    }

    // Global Key Bindings
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      // ESC key toggles view or exits profile
      if (e.key === 'Escape') {
        if (state.currentView === 'profile') {
          switchToView('intro');
        }
        return;
      }

      // If user is not typing in a terminal input, allow quick media shortcuts
      if (!isInputActive) {
        if (e.code === 'Space') {
          e.preventDefault();
          togglePlayPause();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          playPreviousTrack();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          playNextTrack();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMute();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          toggleShuffle();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          toggleRepeat();
        }
      }
    });
  }

  function navigateHistory(source, direction) {
    if (state.commandHistory.length === 0) return;

    if (direction === -1) {
      // Arrow Up
      if (state.historyIndex > 0) {
        state.historyIndex--;
      }
    } else {
      // Arrow Down
      if (state.historyIndex < state.commandHistory.length - 1) {
        state.historyIndex++;
      } else {
        state.historyIndex = state.commandHistory.length;
      }
    }

    const val = state.historyIndex < state.commandHistory.length 
      ? state.commandHistory[state.historyIndex] 
      : '';

    if (source === 'intro') {
      dom.introInput.value = val;
      dom.introVirtualInput.textContent = val;
    } else {
      dom.dockedInput.value = val;
      dom.dockedVirtualInput.textContent = val;
    }
  }

  function autocompleteCommand(inputElem, virtualElem) {
    const list = ['start', 'help', 'about', 'socials', 'links', 'music', 'clear', 'exit'];
    const cur = inputElem.value.trim().toLowerCase();
    if (!cur) return;

    const match = list.find((c) => c.startsWith(cur));
    if (match) {
      inputElem.value = match;
      virtualElem.textContent = match;
    }
  }

  // ==========================================================================
  // 6. GENTLE FALLING SNOW ENGINE (Lightweight Canvas Particle System)
  // ==========================================================================

  function initSnowCanvas() {
    const canvas = dom.snowCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId = null;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    // Particle Setup (45 particles for smooth 60fps and zero lag)
    const particleCount = 45;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.8, // radius
        d: Math.random() * particleCount, // density/phase
        speedY: Math.random() * 0.7 + 0.35,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    let angle = 0;

    function draw() {
      // Pause drawing if page is in background
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      angle += 0.008;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += Math.sin(angle + p.d) * 0.4 + p.speedX;

        // Reset if off bottom or edges
        if (p.y > height) {
          p.y = -5;
          p.x = Math.random() * width;
        }
        if (p.x > width + 5) p.x = -5;
        if (p.x < -5) p.x = width + 5;

        ctx.beginPath();
        ctx.fillStyle = `rgba(240, 245, 255, ${p.opacity})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();
  }

  // ==========================================================================
  // 7. UTILITIES
  // ==========================================================================

  function scrollToBottom(container) {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // 8. INITIALIZATION
  // ==========================================================================

  window.addEventListener('DOMContentLoaded', () => {
    initAudioEngine();
    setupEventListeners();
    initSnowCanvas();
    runBootSequence();
  });

})();
