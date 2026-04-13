/**
 * dashboard.js — client dashboard logic
 * Fetches dashboard data, profile, and notifications.
 * Handles section navigation, profile updates, and notification reads.
 */

(function () {
  // ── Section navigation ──────────────────────────────────────────────────────

  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  const sections = document.querySelectorAll('.content-section');

  function showSection(sectionId) {
    sections.forEach((s) => {
      s.hidden = s.id !== 'section-' + sectionId;
      s.classList.toggle('active', s.id === 'section-' + sectionId);
    });
    navLinks.forEach((l) => {
      l.classList.toggle('active', l.dataset.section === sectionId);
    });

    if (sectionId === 'account') loadProfile();
    if (sectionId === 'notifications') loadNotifications();
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
      closeSidebar();
    });
  });

  // Handle hash-based navigation on load
  const initialSection = (window.location.hash || '#dashboard').replace('#', '');
  showSection(initialSection);

  // ── Mobile sidebar ───────────────────────────────────────────────────────────

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebar = document.getElementById('sidebar');

  function openSidebar() {
    sidebar.classList.add('open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

  // ── Logout ───────────────────────────────────────────────────────────────────

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
      } finally {
        window.location.href = '/index.html';
      }
    });
  }

  // ── Dashboard data ───────────────────────────────────────────────────────────

  async function loadDashboard() {
    try {
      const res = await fetch('/api/client/dashboard');
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!res.ok) throw new Error('Failed to load dashboard');

      const data = await res.json();

      const clientNameEl = document.getElementById('client-name');
      const sidebarNameEl = document.getElementById('sidebar-user-name');
      const summaryCountEl = document.getElementById('summary-notification-count');
      const badgeEl = document.getElementById('notification-badge');

      if (clientNameEl) clientNameEl.textContent = data.name || '';
      if (sidebarNameEl) sidebarNameEl.textContent = data.name || '';
      if (summaryCountEl) summaryCountEl.textContent = data.notificationCount;

      // Prakriti status card
      const prakritiStatusEl = document.getElementById('summary-prakriti-status');
      const prakritiCtaEl = document.getElementById('prakriti-cta');
      if (prakritiStatusEl) {
        if (data.prakritiStatus) {
          prakritiStatusEl.textContent = data.prakritiType
            ? data.prakritiType.charAt(0).toUpperCase() + data.prakritiType.slice(1) + ' (' + data.prakritiStatus + ')'
            : data.prakritiStatus;
          if (prakritiCtaEl) {
            prakritiCtaEl.innerHTML = '<a href="/dashboards/prakritiTest.html" class="btn btn-outline btn-sm">Retake Assessment</a>';
          }
        } else {
          prakritiStatusEl.textContent = 'Not taken';
          if (prakritiCtaEl) {
            prakritiCtaEl.innerHTML = '<a href="/dashboards/prakritiTest.html" class="btn btn-primary btn-sm">Take Assessment</a>';
          }
        }
      }

      if (badgeEl) {
        if (data.notificationCount > 0) {
          badgeEl.textContent = data.notificationCount;
          badgeEl.hidden = false;
        } else {
          badgeEl.hidden = true;
        }
      }
    } catch (err) {
      console.error('loadDashboard error:', err);
    }
  }

  // ── Profile ──────────────────────────────────────────────────────────────────

  const profileForm = document.getElementById('profile-form');
  const profileLoadError = document.getElementById('profile-load-error');
  const profileSuccess = document.getElementById('profile-success');
  const profileError = document.getElementById('profile-error');
  const profileSaveBtn = document.getElementById('profile-save-btn');

  async function loadProfile() {
    if (!profileForm) return;
    try {
      const res = await fetch('/api/client/profile');
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!res.ok) throw new Error('Failed to load profile');

      const user = await res.json();
      document.getElementById('profile-name').value = user.name || '';
      document.getElementById('profile-email').value = user.email || '';
      document.getElementById('profile-role').value = user.role || '';

      if (profileLoadError) profileLoadError.hidden = true;
    } catch (err) {
      if (profileLoadError) {
        profileLoadError.textContent = 'Failed to load profile. Please refresh.';
        profileLoadError.hidden = false;
      }
    }
  }

  function clearProfileErrors() {
    if (profileSuccess) profileSuccess.hidden = true;
    if (profileError) profileError.hidden = true;
    profileForm.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
    profileForm.querySelectorAll('input').forEach((el) => el.classList.remove('input-error'));
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearProfileErrors();

      const name = document.getElementById('profile-name').value;
      profileSaveBtn.disabled = true;

      try {
        const res = await fetch('/api/client/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        const json = await res.json();

        if (res.ok) {
          if (profileSuccess) profileSuccess.hidden = false;
          // Update sidebar name
          const sidebarNameEl = document.getElementById('sidebar-user-name');
          const clientNameEl = document.getElementById('client-name');
          if (sidebarNameEl) sidebarNameEl.textContent = json.name;
          if (clientNameEl) clientNameEl.textContent = json.name;
          return;
        }

        if (json.errors && typeof json.errors === 'object') {
          Object.entries(json.errors).forEach(([field, message]) => {
            const errorEl = document.getElementById('profile-' + field + '-error');
            const inputEl = document.getElementById('profile-' + field);
            if (errorEl) errorEl.textContent = message;
            if (inputEl) inputEl.classList.add('input-error');
          });
        } else if (json.error) {
          if (profileError) {
            profileError.textContent = json.error;
            profileError.hidden = false;
          }
        }
      } catch (err) {
        if (profileError) {
          profileError.textContent = 'Network error. Please try again.';
          profileError.hidden = false;
        }
      } finally {
        profileSaveBtn.disabled = false;
      }
    });
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  const notificationsList = document.getElementById('notifications-list');
  const notificationsLoadError = document.getElementById('notifications-load-error');

  async function loadNotifications() {
    if (!notificationsList) return;

    try {
      const res = await fetch('/api/client/notifications');
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!res.ok) throw new Error('Failed to load notifications');

      const notifications = await res.json();

      if (notificationsLoadError) notificationsLoadError.hidden = true;

      if (notifications.length === 0) {
        notificationsList.innerHTML = '<li class="notifications-empty">No notifications yet.</li>';
        return;
      }

      notificationsList.innerHTML = notifications
        .map(
          (n) => `
          <li class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
            <p class="notification-message">${escapeHtml(n.message)}</p>
            <time class="notification-time" datetime="${n.created_at}">
              ${formatDate(n.created_at)}
            </time>
            ${!n.is_read ? '<span class="unread-dot" aria-label="Unread"></span>' : ''}
          </li>`
        )
        .join('');

      // Mark as read on click
      notificationsList.querySelectorAll('.notification-item.unread').forEach((item) => {
        item.addEventListener('click', () => markRead(item));
      });
    } catch (err) {
      if (notificationsLoadError) {
        notificationsLoadError.textContent = 'Failed to load notifications. Please refresh.';
        notificationsLoadError.hidden = false;
      }
    }
  }

  async function markRead(item) {
    const id = item.dataset.id;
    try {
      const res = await fetch(`/api/client/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) return;

      item.classList.remove('unread');
      item.classList.add('read');
      const dot = item.querySelector('.unread-dot');
      if (dot) dot.remove();

      // Update badge count
      const badgeEl = document.getElementById('notification-badge');
      const summaryCountEl = document.getElementById('summary-notification-count');
      if (badgeEl) {
        const current = parseInt(badgeEl.textContent, 10) || 0;
        const next = Math.max(0, current - 1);
        if (next === 0) {
          badgeEl.hidden = true;
        } else {
          badgeEl.textContent = next;
        }
        if (summaryCountEl) summaryCountEl.textContent = next;
      }
    } catch (err) {
      console.error('markRead error:', err);
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  loadDashboard();
})();
