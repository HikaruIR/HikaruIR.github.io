/* ============================================================================
   HIKARU — SITE CONFIGURATION
   ----------------------------------------------------------------------------
   This is the ONLY file you need to edit for 95% of customisation.
   Everything below is plain JavaScript — keep the commas, quotes and braces.

   Quick index:
     SITE.meta        → page identity used in <title>/sharing
     SITE.profile     → name, handle, bio, status, location, avatar
     SITE.socials     → social links     (add / remove / reorder freely)
     SITE.background  → video / image background + overlay strength
     SITE.music       → playlist, volume, autoplay, random start
     SITE.boot        → loading log + the terminal gate
     SITE.terminal    → prompt, welcome text, custom commands
     SITE.ui          → small interface switches
   ========================================================================== */

window.SITE = {
  /* ---------------------------------------------------------------------- */
  meta: {
    brand: 'Lovely Hikaru',
    title: 'HIKARU — Lovely Hikaru',
    description: 'Eyes on my TARGET. The terminal-side digital identity of HIKARU / Lovely Hikaru.',
    themeColor: '#050505',
    year: 2026
  },

  /* ---------------------------------------------------------------------- */
  profile: {
    username: 'HIKARU',
    handle: 'hikaru',
    bioLead: 'Eyes on my',
    bioAccent: 'TARGET',           // rendered in bright terminal green
    status: 'ONLINE',              // status chip text
    customStatus: 'eyes on the target',
    location: 'Tehran, IR',
    timezone: 'Asia/Tehran',       // used by the clock; 'auto' = visitor's zone
    avatar: 'assets/profile/avatar.jpg',
    // Shown by `about` inside the gate and the terminal. One line per string.
    about: [
      'Operator of this node. Terminal enthusiast, night-shift listener.',
      'I keep a small footprint: sharp tools, clean interfaces, loud music.',
      'Known locally as Lovely Hikaru. The signal says HIKARU.',
      'Eyes on my target — always.'
    ],
    tags: ['terminal', 'design', 'music', 'identity']
  },

  /* ---------------------------------------------------------------------- */
  /* URLs / order / labels are all editable. `icon` must stay github,        */
  /* telegram or discord to use the bundled brand marks.                     */
  socials: [
    {
      id: 'github',
      icon: 'github',
      label: 'GitHub',
      handle: 'HikaruIR',
      url: 'https://github.com/HikaruIR'
    },
    {
      id: 'telegram',
      icon: 'telegram',
      label: 'Telegram',
      handle: 'hikaru_mp4',
      url: 'https://t.me/hikaru_mp4'
    },
    {
      id: 'discord',
      icon: 'discord',
      label: 'Discord',
      handle: 'theunitedstates',
      url: 'https://discord.gg/theunitedstates'
    }
  ],

  /* ---------------------------------------------------------------------- */
  background: {
    // 'video' | 'image'
    type: 'video',
    src: 'assets/backgrounds/background.mp4',
    poster: 'assets/backgrounds/poster.jpg',
    fallback: 'assets/backgrounds/fallback.jpg',
    // 0 = no darkening, 1 = fully black. Keep between .45 and .8 for readability.
    overlay: 0.68,
    // Optional extra darkening behind the profile itself (0.0–0.6).
    focusDim: 0.36,
    // Load media only after the terminal gate is passed (faster first paint).
    loadAfterStart: true,
    // Very subtle spotlight that follows the cursor on desktop.
    spotlight: true,
    // Static-looking extras — all safe to disable.
    scanlines: true,
    grain: true,
    grid: true,
    // Object-position for image backgrounds: 'center', 'top', ...
    position: 'center'
  },

  /* ---------------------------------------------------------------------- */
  music: {
    enabled: true,
    autoplayOnStart: true,     // the gate's start command is the user gesture
    startRandom: false,        // false = first track (Одного) starts on every refresh; true = random
    volume: 0.65,              // 0 → 1, initial volume when nothing remembered
    rememberVolume: true,      // remember volume for the browser session
    fadeIn: true,              // fade volume in when starting
    tracks: [
      {
        id: 'odnogo',
        title: 'Одного',
        artist: 'Татьяна Куртукова',
        src: 'assets/music/odnogo.mp3',
        cover: 'assets/covers/odnogo.jpg'
      },
      {
        id: 'feel-good-inc',
        title: 'Feel Good Inc.',
        artist: 'Gorillaz',
        src: 'assets/music/feel-good-inc.mp3',
        cover: 'assets/covers/feel-good-inc.jpg'
      },
      {
        id: 'let-it-happen',
        title: 'Let It Happen',
        artist: 'Tame Impala',
        src: 'assets/music/let-it-happen.mp3',
        cover: 'assets/covers/let-it-happen.jpg'
      },
      {
        id: 'far-from-any-road',
        title: 'Far From Any Road',
        artist: 'The Handsome Family',
        src: 'assets/music/far-from-any-road.mp3',
        cover: 'assets/covers/far-from-any-road.jpg'
      },
      {
        id: 'dance-with-the-devil',
        title: 'Dance With The Devil',
        artist: 'Immortal Technique',
        src: 'assets/music/dance-with-the-devil.mp3',
        cover: 'assets/covers/dance-with-the-devil.jpg'
      }
    ]
  },

  /* ---------------------------------------------------------------------- */
  boot: {
    platform: 'WEB',
    lines: [
      { text: 'initializing HIKARU interface', tag: 'ok' },
      { text: 'loading profile modules', tag: '4/4' },
      { text: 'connecting to social network', tag: 'ok' },
      { text: 'decrypting audio vault', tag: '5 tracks' },
      { text: 'calibrating optical link', tag: '60hz' },
      { text: 'establishing secure session', tag: 'ok' }
    ],
    ready: 'system ready — awaiting input',
    // ms per character for the log lines (0 = instant)
    typeSpeed: 11,
    // ms between lines
    lineDelay: 110,
    // if true the gate can be skipped with the ?skipboot=1 URL flag
    allowSkip: true,

    // The full-screen terminal gate. Visitors type one of openCommands
    // (or press the [ start ] button) to open the profile.
    gate: {
      openCommands: ['start', 'open', 'enter', 'profile', 'go'],
      hint: 'type start + enter to open the profile',
      autoFocus: true
    }
  },

  /* ---------------------------------------------------------------------- */
  terminal: {
    enabled: true,
    user: 'hikaru',
    host: 'lovely',
    cwd: '~',
    // Printed once when the terminal is first opened.
    welcome: [
      'HIKARU shell v1.0.0 — type `help` to get started.',
      'Tip: ↑ / ↓ browse history, Tab completes commands.'
    ],
    // extra custom commands: name → plain text output (array of lines)
    customCommands: {
      'fav': ['my favourite thing? come on — my target matters more.', 'eyes on my TARGET.'],
      'status': ['node: online', 'target: locked', 'noise: filtered']
    }
  },

  /* ---------------------------------------------------------------------- */
  ui: {
    clock24h: true,
    showColophon: true,
    // Respects prefers-reduced-motion automatically
    motion: 'auto',
    // Keyboard shortcuts (true = enabled)
    shortcuts: true,
    // Show a subtle CRT scanline layer
    crt: true
  }
};
