/**
 * yoga.js — fetches yoga sessions, renders by category, handles assignment and progress logging.
 */
(async function () {
  const loadingEl       = document.getElementById('loading');
  const statusMsg       = document.getElementById('status-msg');
  const sessionsContainer = document.getElementById('sessions-container');
  const assignedSection = document.getElementById('assigned-section');
  const assignmentsContainer = document.getElementById('assignments-container');
  const categoryFilter  = document.getElementById('category-filter');

  let allGrouped = {};

  function showMsg(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = type;
    statusMsg.style.display = 'block';
    setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
  }

  function renderSessions(grouped) {
    sessionsContainer.innerHTML = '';
    const categories = Object.keys(grouped).sort();

    if (categories.length === 0) {
      sessionsContainer.innerHTML = '<p>No yoga sessions available.</p>';
      return;
    }

    for (const cat of categories) {
      const section = document.createElement('div');
      section.className = 'category-section';

      const title = document.createElement('div');
      title.className = 'category-title';
      title.textContent = cat;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'session-grid';

      for (const session of grouped[cat]) {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.innerHTML = `
          <h3>${escHtml(session.title)}</h3>
          ${session.therapist_name ? `<p><strong>Therapist:</strong> ${escHtml(session.therapist_name)}</p>` : ''}
          ${session.description ? `<p>${escHtml(session.description)}</p>` : ''}
          ${session.video_link ? `<a href="${escHtml(session.video_link)}" target="_blank" rel="noopener">Watch video ↗</a>` : ''}
        `;
        const btn = document.createElement('button');
        btn.className = 'assign-btn';
        btn.textContent = 'Assign to My Plan';
        btn.dataset.sessionId = session.id;
        btn.addEventListener('click', () => handleAssign(session.id, btn));
        card.appendChild(btn);
        grid.appendChild(card);
      }

      section.appendChild(grid);
      sessionsContainer.appendChild(section);
    }
  }

  async function handleAssign(sessionId, btn) {
    btn.disabled = true;
    btn.textContent = 'Assigning…';
    try {
      const res = await fetch('/api/yoga/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ yoga_session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Failed to assign plan.', 'error');
        btn.disabled = false;
        btn.textContent = 'Assign to My Plan';
        return;
      }
      showMsg('Yoga plan assigned successfully!', 'success');
      btn.textContent = 'Assigned ✓';
      await loadAssignments();
    } catch {
      showMsg('Network error. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Assign to My Plan';
    }
  }

  async function loadAssignments() {
    try {
      const res = await fetch('/api/yoga/assignments', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      renderAssignments(data.assignments || []);
    } catch {
      // silently ignore
    }
  }

  function renderAssignments(assignments) {
    if (assignments.length === 0) {
      assignedSection.style.display = 'none';
      return;
    }
    assignedSection.style.display = 'block';
    assignmentsContainer.innerHTML = '';

    for (const a of assignments) {
      const card = document.createElement('div');
      card.className = 'assignment-card';
      const assignedDate = new Date(a.assigned_at).toLocaleDateString();
      card.innerHTML = `
        <h3>${escHtml(a.title || 'Yoga Session')}</h3>
        <div class="meta">Assigned: ${assignedDate} · Category: ${escHtml(a.category || '')}</div>
        ${a.progress_notes ? `<p><strong>Progress notes:</strong> ${escHtml(a.progress_notes)}</p>` : ''}
      `;

      const form = document.createElement('div');
      form.className = 'progress-form';
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Log your progress…';
      textarea.value = a.progress_notes || '';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save Progress';
      const savedMsg = document.createElement('span');
      savedMsg.className = 'progress-saved';
      savedMsg.textContent = 'Saved!';

      saveBtn.addEventListener('click', async () => {
        const notes = textarea.value.trim();
        if (!notes) return;
        saveBtn.disabled = true;
        try {
          const res = await fetch(`/api/yoga/progress/${a.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ progress_notes: notes }),
          });
          const data = await res.json();
          if (res.ok) {
            savedMsg.style.display = 'inline';
            setTimeout(() => { savedMsg.style.display = 'none'; }, 3000);
          } else {
            showMsg(data.error || 'Failed to save progress.', 'error');
          }
        } catch {
          showMsg('Network error. Please try again.', 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });

      form.appendChild(textarea);
      form.appendChild(saveBtn);
      form.appendChild(savedMsg);
      card.appendChild(form);
      assignmentsContainer.appendChild(card);
    }
  }

  function populateCategoryFilter(grouped) {
    const categories = Object.keys(grouped).sort();
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    }
  }

  categoryFilter.addEventListener('change', () => {
    const selected = categoryFilter.value;
    if (!selected) {
      renderSessions(allGrouped);
    } else {
      renderSessions({ [selected]: allGrouped[selected] || [] });
    }
  });

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Initial load
  loadingEl.style.display = 'block';
  try {
    const res = await fetch('/api/yoga/sessions', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      showMsg(data.error || 'Failed to load sessions.', 'error');
      return;
    }
    allGrouped = data.grouped || {};
    populateCategoryFilter(allGrouped);
    renderSessions(allGrouped);
    await loadAssignments();
  } catch {
    showMsg('Network error. Please try again.', 'error');
  } finally {
    loadingEl.style.display = 'none';
  }
})();
