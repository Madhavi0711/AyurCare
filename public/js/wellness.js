/**
 * wellness.js — Client wellness dashboard logic
 * Handles: navbar, hero stats, prakriti section, services tabs,
 *          profile, notifications.
 */
(function () {
  'use strict';

  var dashboardData = null;

  // ── Navbar: hamburger + avatar dropdown ──────────────────────────────
  var hamburgerBtn   = document.getElementById('hamburger-btn');
  var mobileDrawer   = document.getElementById('mobile-drawer');
  var drawerOverlay  = document.getElementById('drawer-overlay');
  var drawerClose    = document.getElementById('drawer-close');
  var avatarBtn      = document.getElementById('avatar-btn');
  var avatarDropdown = document.getElementById('avatar-dropdown');

  function openDrawer() {
    mobileDrawer.hidden = false;
    drawerOverlay.hidden = false;
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    mobileDrawer.hidden = true;
    drawerOverlay.hidden = true;
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerClose)  drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // Close drawer on data-close links
  document.querySelectorAll('.wl-drawer-link[data-close]').forEach(function(link) {
    link.addEventListener('click', function() {
      closeDrawer();
      var section = link.dataset.section;
      if (section) showInlineSection(section);
    });
  });

  // Avatar dropdown toggle
  if (avatarBtn) {
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = !avatarDropdown.hidden;
      avatarDropdown.hidden = isOpen;
      avatarBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  document.addEventListener('click', function() {
    if (avatarDropdown) {
      avatarDropdown.hidden = true;
      if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Dropdown items that show inline sections
  document.querySelectorAll('.wl-dropdown-item[data-section]').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      showInlineSection(item.dataset.section);
      if (avatarDropdown) avatarDropdown.hidden = true;
    });
  });

  // Logout
  ['logout-btn', 'drawer-logout-btn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function() {
        fetch('/api/logout', { method: 'POST' }).finally(function() {
          window.location.href = '/index.html';
        });
      });
    }
  });

  // ── Inline section toggling ───────────────────────────────────────────
  var INLINE_SECTIONS = ['account', 'notifications'];
  function showInlineSection(id) {
    INLINE_SECTIONS.forEach(function(sid) {
      var el = document.getElementById(sid);
      if (el) el.hidden = (sid !== id);
    });
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (id === 'account') loadProfile();
      if (id === 'notifications') loadNotifications();
    }
  }

  // Expose globally so stat cards and external callers can trigger it
  window.showInlineSectionGlobal = showInlineSection;

  // ── Welcome Modal ─────────────────────────────────────────────────────
  function maybeShowWelcome(name) {
    if (!sessionStorage.getItem('ayurcare_just_logged_in')) return;
    sessionStorage.removeItem('ayurcare_just_logged_in');
    var modal = document.getElementById('welcome-modal');
    var title = document.getElementById('welcome-modal-title');
    var closeBtn = document.getElementById('welcome-modal-close');
    if (!modal || !title || !closeBtn) return;
    title.textContent = 'Welcome back, ' + (name || 'there') + '!';
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    closeBtn.addEventListener('click', function() {
      modal.classList.remove('visible');
      document.body.style.overflow = '';
    });
    document.getElementById('welcome-modal-backdrop').addEventListener('click', function() {
      modal.classList.remove('visible');
      document.body.style.overflow = '';
    });
  }

  // ── Load Dashboard Data ───────────────────────────────────────────────
  function loadDashboard() {
    fetch('/api/client/dashboard', { credentials: 'include' })
      .then(function(res) {
        if (res.status === 401) { window.location.href = '/login.html'; return null; }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(function(data) {
        if (!data) return;
        dashboardData = data;

        var navName = document.getElementById('nav-user-name');
        if (navName) navName.textContent = data.name || '';
        maybeShowWelcome(data.name);

        // Prakriti stat
        var statPrakriti = document.getElementById('stat-prakriti');
        if (statPrakriti) {
          if (data.prakritiType) {
            var t = data.prakritiType;
            statPrakriti.textContent = t.charAt(0).toUpperCase() + t.slice(1);
          } else {
            statPrakriti.textContent = 'Not assessed';
          }
        }

        // Notifications stat
        var statNotif = document.getElementById('stat-notif');
        if (statNotif) {
          statNotif.textContent = data.notificationCount > 0
            ? data.notificationCount + ' unread'
            : 'No new updates';
        }

        // Active plans stat — fetch from plans API
        fetch('/api/client/plans', { credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : []; })
          .then(function(plans) {
            var statPlans = document.getElementById('stat-plans');
            if (statPlans) {
              var active = plans.filter(function(p) { return p.status === 'active'; });
              statPlans.textContent = active.length > 0 ? active.length + ' active' : 'No active plans';
            }
          })
          .catch(function() {
            var statPlans = document.getElementById('stat-plans');
            if (statPlans) statPlans.textContent = '—';
          });

        // Membership stat
        var statMembership = document.getElementById('stat-membership');
        if (statMembership) {
          statMembership.textContent = data.membership_type === 'paid' ? 'Premium' : 'Free';
        }

        // Notification dot on avatar
        var notifDot = document.getElementById('notif-badge-nav');
        if (notifDot) notifDot.hidden = (data.notificationCount === 0);
        var avatarDot = document.getElementById('avatar-notif-dot');
        if (avatarDot) avatarDot.style.display = data.notificationCount > 0 ? 'block' : 'none';

        // Update prakriti section status block
        updatePrakritiBlock(data);
      })
      .catch(function(err) {
        console.error('loadDashboard error:', err);
      });
  }

  function updatePrakritiBlock(data) {
    var block = document.getElementById('prakriti-status-text');
    if (!block) return;
    if (data.prakritiType) {
      var t = data.prakritiType;
      var cap = t.charAt(0).toUpperCase() + t.slice(1);
      var status = data.prakritiStatus === 'approved' ? 'Approved' : 'Pending review';
      block.innerHTML = 'Your dominant Prakriti is <strong>' + cap + '</strong>. Status: ' + status + '.';
    } else {
      block.textContent = 'You have not taken the Prakriti assessment yet. Take the test to receive personalised recommendations.';
    }
  }

  // ── Services Tabs ─────────────────────────────────────────────────────
  var tabs      = document.querySelectorAll('.wl-tab');
  var tabPanels = document.querySelectorAll('.wl-tab-panel');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(function(p) { p.hidden = true; });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      var panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) panel.hidden = false;
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────
  var profileForm    = document.getElementById('profile-form');
  var profileSaveBtn = document.getElementById('profile-save-btn');

  function loadProfile() {
    if (!profileForm) return;
    fetch('/api/client/profile', { credentials: 'include' })
      .then(function(res) {
        if (res.status === 401) { window.location.href = '/login.html'; return null; }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(function(user) {
        if (!user) return;
        document.getElementById('profile-name').value  = user.name  || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-role').value  = user.role  || '';
        var errEl = document.getElementById('profile-load-error');
        if (errEl) errEl.hidden = true;
      })
      .catch(function() {
        var errEl = document.getElementById('profile-load-error');
        if (errEl) { errEl.textContent = 'Failed to load profile. Please refresh.'; errEl.hidden = false; }
      });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = document.getElementById('profile-name').value;
      var successEl = document.getElementById('profile-success');
      var errorEl   = document.getElementById('profile-error');
      var nameErrEl = document.getElementById('profile-name-error');
      if (successEl) successEl.hidden = true;
      if (errorEl)   errorEl.hidden = true;
      if (nameErrEl) nameErrEl.textContent = '';
      if (profileSaveBtn) profileSaveBtn.disabled = true;

      fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name }),
      })
        .then(function(res) { return res.json().then(function(j) { return { ok: res.ok, json: j }; }); })
        .then(function(r) {
          if (r.ok) {
            if (successEl) successEl.hidden = false;
            var navName = document.getElementById('nav-user-name');
            if (navName) navName.textContent = r.json.name;
          } else if (r.json.errors && r.json.errors.name && nameErrEl) {
            nameErrEl.textContent = r.json.errors.name;
          } else if (r.json.error && errorEl) {
            errorEl.textContent = r.json.error; errorEl.hidden = false;
          }
        })
        .catch(function() {
          if (errorEl) { errorEl.textContent = 'Network error.'; errorEl.hidden = false; }
        })
        .finally(function() {
          if (profileSaveBtn) profileSaveBtn.disabled = false;
        });
    });
  }

  // ── Notifications ─────────────────────────────────────────────────────
  function loadNotifications() {
    var list  = document.getElementById('notifications-list');
    var errEl = document.getElementById('notifications-load-error');
    if (!list) return;

    fetch('/api/client/notifications', { credentials: 'include' })
      .then(function(res) {
        if (res.status === 401) { window.location.href = '/login.html'; return null; }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(function(notifs) {
        if (!notifs) return;
        if (errEl) errEl.hidden = true;

        if (!notifs.length) {
          list.innerHTML = '<li class="wl-notif-empty">You have no new notifications at the moment.</li>';
          return;
        }

        list.innerHTML = notifs.map(function(n) {
          return '<li class="wl-notif-item ' + (n.is_read ? 'read' : 'unread') + '" data-id="' + n.id + '">' +
            '<p class="wl-notif-msg">' + escHtml(n.message) + '</p>' +
            '<time class="wl-notif-time" datetime="' + n.created_at + '">' + fmtDate(n.created_at) + '</time>' +
            (!n.is_read ? '<span class="wl-notif-dot" aria-label="Unread"></span>' : '') +
            '</li>';
        }).join('');

        // Mark all unread as read after viewing
        var hasUnread = notifs.some(function(n) { return !n.is_read; });
        if (hasUnread) {
          fetch('/api/client/notifications/read-all', { method: 'PATCH', credentials: 'include' })
            .then(function() {
              // Update navbar dot
              var notifDot = document.getElementById('notif-badge-nav');
              if (notifDot) notifDot.hidden = true;
              if (dashboardData) dashboardData.notificationCount = 0;
              // Update stat card
              var statNotif = document.getElementById('stat-notif');
              if (statNotif) statNotif.textContent = 'No new updates';
            })
            .catch(function() {});
        }
      })
      .catch(function() {
        if (errEl) { errEl.textContent = 'Failed to load notifications.'; errEl.hidden = false; }
      });
  }

  function markRead(item) {
    var id = item.dataset.id;
    fetch('/api/client/notifications/' + id + '/read', { method: 'PATCH', credentials: 'include' })
      .then(function(res) {
        if (!res.ok) return;
        item.classList.remove('unread');
        item.classList.add('read');
        var dot = item.querySelector('.wl-notif-dot');
        if (dot) dot.remove();
        var notifDot = document.getElementById('notif-badge-nav');
        if (notifDot && dashboardData) {
          dashboardData.notificationCount = Math.max(0, (dashboardData.notificationCount || 1) - 1);
          notifDot.hidden = (dashboardData.notificationCount === 0);
        }
      })
      .catch(function() {});
  }

  // ── Utilities ─────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString(); } catch(e) { return iso; }
  }

  // ── Init ──────────────────────────────────────────────────────────────
  loadDashboard();

})();
