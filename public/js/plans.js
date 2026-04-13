/**
 * plans.js — fetches and renders the client's subscription plans.
 * Navbar/drawer/logout are handled by the inline script in plans.html.
 */
(function () {
  'use strict';

  var container   = document.getElementById('plans-container');
  var errorBanner = document.getElementById('plans-error');

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function renderPlans(plans) {
    if (!plans || plans.length === 0) {
      container.innerHTML = '<p class="plans-empty" style="color:#7a6a55;font-style:italic;padding:24px 0;">You have no active subscription plans. Upgrade to Premium to unlock all features.</p>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'plans-grid';
    plans.forEach(function(plan) {
      var isExpired = plan.status === 'expired';
      var card = document.createElement('div');
      card.className = 'plan-card' + (isExpired ? ' expired' : '');
      card.innerHTML =
        '<div class="plan-card-header">' +
          '<h3 class="plan-name">' + escapeHtml(plan.plan_name) + '</h3>' +
          '<span class="status-badge ' + (isExpired ? 'expired' : 'active') + '">' + (isExpired ? 'Expired' : 'Active') + '</span>' +
        '</div>' +
        '<div class="plan-detail"><span>Valid From</span><span>' + formatDate(plan.valid_from) + '</span></div>' +
        '<div class="plan-detail"><span>Valid Until</span><span>' + formatDate(plan.valid_until) + '</span></div>' +
        '<div class="plan-detail"><span>Payment Status</span><span>' + escapeHtml(plan.payment_status) + '</span></div>' +
        (plan.renewal_reminder ? '<div class="renewal-banner">Your plan expires soon. Please renew to continue services.</div>' : '');
      grid.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(grid);
  }

  function loadPlans() {
    fetch('/api/client/plans', { credentials: 'include' })
      .then(function(res) {
        if (res.status === 401) { window.location.href = '/login.html'; return null; }
        if (!res.ok) {
          return res.json().catch(function() { return {}; }).then(function(data) {
            if (errorBanner) { errorBanner.textContent = data.error || 'Failed to load plans.'; errorBanner.hidden = false; }
            container.innerHTML = '';
            return null;
          });
        }
        return res.json();
      })
      .then(function(plans) {
        if (plans) renderPlans(plans);
      })
      .catch(function() {
        if (errorBanner) { errorBanner.textContent = 'Network error. Please try again.'; errorBanner.hidden = false; }
        if (container) container.innerHTML = '';
      });
  }

  loadPlans();
})();
