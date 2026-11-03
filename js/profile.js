/* ============================================================================
   LOVELY HIKARU — PROFILE RENDERING + LIVE CLOCK
   Everything here is driven by SITE.profile / SITE.meta / SITE.socials.
   ========================================================================== */
(function () {
  'use strict';

  var HIKARU = (window.HIKARU = window.HIKARU || {});
  var utils = HIKARU.utils || {};
  var site = window.SITE || {};
  var config = site.profile || {};
  var meta = site.meta || {};
  var ui = site.ui || {};

  var ICONS = {
    github:
      '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
    telegram:
      '<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
    discord:
      '<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>',
    link:
      '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4z"/>'
  };

  var startTime = Date.now();
  var clockTimer = 0;
  var timeZone;
  var zoneLabel = '';

  function $(selector) {
    return utils.qs ? utils.qs(selector) : document.querySelector(selector);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = byId(id);
    if (element && value != null) element.textContent = value;
  }

  function iconSvg(name) {
    return (
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      (ICONS[name] || ICONS.link) +
      '</svg>'
    );
  }

  function externalArrow() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
  }

  function resolveTimeZone() {
    var configured = config.timezone && config.timezone !== 'auto' ? config.timezone : undefined;
    try {
      var resolved = new Intl.DateTimeFormat('en-GB', {
        timeZone: configured
      }).resolvedOptions().timeZone;
      timeZone = configured || resolved;
      var city = String(resolved || configured || 'local').split('/').pop();
      zoneLabel = city.replace(/_/g, ' ').toUpperCase();
    } catch (error) {
      timeZone = undefined;
      zoneLabel = 'LOCAL';
    }
  }

  function formatClock(date, withSeconds) {
    var options = {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: ui.clock24h === false ? 'h12' : 'h23'
    };
    if (withSeconds) options.second = '2-digit';
    if (timeZone) options.timeZone = timeZone;
    try {
      return new Intl.DateTimeFormat('en-GB', options).format(date);
    } catch (error) {
      return date.toLocaleTimeString('en-GB');
    }
  }

  function formatUptime(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    var pad = utils.pad2 || function (value) { return String(value).padStart(2, '0'); };
    if (hours > 0) return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    return pad(minutes) + ':' + pad(seconds);
  }

  function updateClock() {
    var now = new Date();
    setText('clock', formatClock(now, true));
    setText('data-time', formatClock(now, false).replace(/\s?[AP]M$/i, ''));
    setText('data-uptime', formatUptime(Date.now() - startTime));
  }

  function renderMeta() {
    if (meta.title) document.title = meta.title;
    if (meta.themeColor) {
      var theme = document.querySelector('meta[name="theme-color"]');
      if (theme) theme.setAttribute('content', meta.themeColor);
    }
    if (meta.description) {
      var description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute('content', meta.description);
      var ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', meta.description);
    }
    setText('year', String(meta.year || new Date().getFullYear()));
    setText('clock-zone', zoneLabel);
  }

  function renderAvatar() {
    var wrapper = byId('avatar-wrap');
    var avatar = byId('avatar');
    if (!wrapper || !avatar) return;

    var source = config.avatar || avatar.getAttribute('src');
    if (source) avatar.setAttribute('src', source);
    avatar.setAttribute('alt', (config.username || 'profile') + ' avatar');
    avatar.setAttribute('width', '112');
    avatar.setAttribute('height', '112');

    avatar.addEventListener('error', function () {
      wrapper.classList.add('is-missing');
      wrapper.setAttribute(
        'data-initials',
        String(config.username || 'LH').slice(0, 2).toUpperCase()
      );
    });
  }

  function renderIdentity() {
    var name = byId('profile-name');
    if (name) name.textContent = config.username || 'HIKARU';

    var handle = byId('profile-handle');
    if (handle) {
      handle.textContent = '';
      var at = document.createElement('span');
      at.className = 'at';
      at.textContent = '@';
      handle.appendChild(at);
      handle.appendChild(document.createTextNode(config.handle || 'hikaru'));
    }

    var eyebrow = $('.profile__eyebrow');
    if (eyebrow) {
      eyebrow.textContent = '';
      eyebrow.appendChild(
        document.createTextNode(String(meta.brand || 'LOVELY HIKARU').toUpperCase())
      );
      var sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '/';
      eyebrow.appendChild(sep);
      eyebrow.appendChild(document.createTextNode('DIGITAL IDENTITY'));
    }

    var bio = byId('profile-bio');
    if (bio) {
      bio.textContent = '';
      var lead = config.bioLead || '';
      if (config.bio && !config.bioAccent) {
        bio.appendChild(document.createTextNode(config.bio));
      } else {
        if (lead) bio.appendChild(document.createTextNode(lead + ' '));
        if (config.bioAccent) {
          var accent = document.createElement('span');
          accent.className = 'bio__target';
          accent.textContent = config.bioAccent;
          bio.appendChild(accent);
        }
      }
      var caret = document.createElement('span');
      caret.className = 'bio__caret';
      caret.setAttribute('aria-hidden', 'true');
      bio.appendChild(caret);
    }

    var liveChip = $('.chip--live');
    if (liveChip) {
      liveChip.textContent = '';
      var dot = document.createElement('span');
      dot.className = 'dot dot--live';
      dot.setAttribute('aria-hidden', 'true');
      liveChip.appendChild(dot);
      liveChip.appendChild(document.createTextNode(String(config.status || 'ONLINE').toUpperCase()));
    }

    var pill = $('.topbar__pill');
    if (pill) {
      pill.textContent = '';
      var pillDot = document.createElement('span');
      pillDot.className = 'dot dot--live';
      pillDot.setAttribute('aria-hidden', 'true');
      pill.appendChild(pillDot);
      pill.appendChild(document.createTextNode(String(config.status || 'ONLINE').toUpperCase()));
    }

    var customChip = byId('chip-status');
    if (customChip) {
      if (config.customStatus) customChip.textContent = config.customStatus;
      else customChip.remove();
    }

    var locationChip = byId('chip-location');
    if (locationChip) {
      if (config.location) locationChip.textContent = config.location;
      else locationChip.remove();
    }
  }

  function renderSocials() {
    var nav = byId('socials');
    if (!nav) return;
    var list = Array.isArray(site.socials) ? site.socials : [];
    nav.textContent = '';

    list.forEach(function (social) {
      if (!social) return;
      var url = social.url || '#';
      var link = document.createElement('a');
      link.className = 'social';
      link.href = url;
      link.setAttribute('rel', 'noopener noreferrer');
      if (/^https?:/i.test(url)) link.setAttribute('target', '_blank');
      link.setAttribute(
        'aria-label',
        (social.label || social.id || 'social') +
          (social.handle ? ' — ' + social.handle : '')
      );
      if (social.id) link.setAttribute('data-social', social.id);

      var icon = document.createElement('span');
      icon.className = 'social__icon';
      icon.innerHTML = iconSvg(social.icon || social.id);

      var text = document.createElement('span');
      text.className = 'social__text';

      var label = document.createElement('span');
      label.className = 'social__label';
      label.textContent = social.label || social.id || 'link';

      var handle = document.createElement('span');
      handle.className = 'social__handle';
      handle.textContent =
        social.handle || String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');

      text.appendChild(label);
      text.appendChild(handle);

      var arrow = document.createElement('span');
      arrow.className = 'social__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = externalArrow();

      link.appendChild(icon);
      link.appendChild(text);
      link.appendChild(arrow);
      nav.appendChild(link);
    });
  }

  function bindPlayerData() {
    var onTrack = function (event) {
      var detail = event.detail || {};
      var track = detail.track || {};
      var index = typeof detail.index === 'number' ? detail.index + 1 : null;
      var pad = utils.pad2 || function (value) { return String(value).padStart(2, '0'); };
      var prefix = index != null ? pad(index) + ' · ' : '';
      setText('data-track', prefix + (track.title || '—'));
    };

    utils.on(document, 'hikaru:player:track', onTrack);
    utils.on(document, 'hikaru:player:ready', onTrack);

    utils.on(document, 'hikaru:player:error', function (event) {
      var detail = event.detail || {};
      var pad = utils.pad2 || function (value) { return String(value).padStart(2, '0'); };
      if (typeof detail.index === 'number') {
        setText('data-track', pad(detail.index + 1) + ' · unavailable');
      }
    });
  }

  function init() {
    if (!document.body) return;
    resolveTimeZone();
    renderMeta();
    renderAvatar();
    renderIdentity();
    renderSocials();
    bindPlayerData();

    updateClock();
    if (clockTimer) window.clearInterval(clockTimer);
    clockTimer = window.setInterval(updateClock, 1000);
  }

  HIKARU.profile = {
    init: init,
    updateClock: updateClock
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
