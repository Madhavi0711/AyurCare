/**
 * client-init.js — runs on every client page.
 * 1. Applies dark mode instantly from localStorage (no flash).
 * 2. Fetches user settings from server and applies them.
 * 3. Sets the user's name in #nav-user-name on every page.
 * 4. Redirects to /login.html on 401.
 */
(function () {
  'use strict';

  // ── 1. Apply dark mode instantly from localStorage (before server fetch) ──
  if (localStorage.getItem('ayurcare_dark') === '1') {
    document.documentElement.classList.add('dark-mode');
    document.body && document.body.classList.add('dark-mode');
  }

  // Apply dark mode as soon as body is available
  function applyDarkMode(on) {
    var body = document.body || document.documentElement;
    if (on) {
      body.classList.add('dark-mode');
      localStorage.setItem('ayurcare_dark', '1');
    } else {
      body.classList.remove('dark-mode');
      localStorage.setItem('ayurcare_dark', '0');
    }
  }

  // ── 2. Fetch settings from server and apply ────────────────────────────────
  function loadSettings() {
    fetch('/api/client/settings', { credentials: 'include' })
      .then(function (r) {
        if (r.status === 401) { window.location.href = '/login.html'; return null; }
        return r.ok ? r.json() : null;
      })
      .then(function (s) {
        if (!s) return;
        applyDarkMode(s.dark_mode === true);
        // Sync the toggle on settings page if present
        var darkToggle = document.getElementById('toggle-dark');
        if (darkToggle) darkToggle.checked = s.dark_mode === true;
        var notifToggle = document.getElementById('toggle-notif');
        if (notifToggle) notifToggle.checked = s.notifications_enabled !== false;
      })
      .catch(function () {});
  }

  // ── 3. Fetch user name and set in navbar ───────────────────────────────────
  function loadUserName() {
    fetch('/api/client/dashboard', { credentials: 'include' })
      .then(function (r) {
        if (r.status === 401) { window.location.href = '/login.html'; return null; }
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        if (!d) return;
        // Set name in any navbar element that holds the user name
        ['nav-user-name', 'sp-user-name'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = d.name || '';
        });
        // Also set the wl-user-greeting strong tag
        var nameEl = document.querySelector('#nav-user-name');
        if (nameEl) nameEl.textContent = d.name || '';
        // Notification dot on avatar (orange dot)
        var avatarDot = document.getElementById('avatar-notif-dot');
        if (avatarDot) avatarDot.style.display = d.notificationCount > 0 ? 'block' : 'none';
      })
      .catch(function () {});
  }

  // Run on DOMContentLoaded so body exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyDarkMode(localStorage.getItem('ayurcare_dark') === '1');
      loadSettings();
      loadUserName();
    });
  } else {
    applyDarkMode(localStorage.getItem('ayurcare_dark') === '1');
    loadSettings();
    loadUserName();
  }

  // ── 4. Expose applyDarkMode globally for settings page toggle ─────────────
  window.ayurApplyDarkMode = applyDarkMode;

})();
