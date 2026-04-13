(function () {
  // Sidebar toggle
  var hamburger = document.getElementById('hamburger-btn');
  var sidebar = document.getElementById('sidebar');
  var sidebarClose = document.getElementById('sidebar-close');
  var sidebarOverlay = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', function() {
      sidebar.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      if (sidebarOverlay) sidebarOverlay.classList.add('active');
    });
  }
  if (sidebarClose) {
    sidebarClose.addEventListener('click', function() {
      sidebar.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Logout
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      fetch('/api/logout', { method: 'POST' }).finally(function() {
        window.location.href = '/index.html';
      });
    });
  }

  // Load dashboard stats
  fetch('/api/admin/dashboard', { credentials: 'include' })
    .then(function(res) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return null;
      }
      if (!res.ok) throw new Error('Failed to load dashboard data');
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      var pendingEl = document.getElementById('pending-assessments-count');
      var unassignedEl = document.getElementById('unassigned-plans-count');
      if (pendingEl) pendingEl.textContent = data.pendingAssessments;
      if (unassignedEl) unassignedEl.textContent = data.unassignedPlans;
    })
    .catch(function(err) {
      console.error('Dashboard load error:', err);
      var errorEl = document.getElementById('dashboard-error');
      if (errorEl) {
        errorEl.textContent = 'Failed to load dashboard data. Please refresh.';
        errorEl.hidden = false;
      }
    });
})();
