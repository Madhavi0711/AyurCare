/**
 * diet.js — fetches and renders the client's diet plan on load.
 * If no plan exists yet, shows a button to generate one.
 */
(async function () {
  const loadingEl      = document.getElementById('loading');
  const statusMsg      = document.getElementById('status-msg');
  const dietCard       = document.getElementById('diet-card');
  const generateBtn    = document.getElementById('generate-btn');

  function showError(msg) {
    statusMsg.textContent = msg;
    statusMsg.className   = 'error';
    statusMsg.style.display = 'block';
  }

  function showInfo(msg) {
    statusMsg.textContent = msg;
    statusMsg.className   = 'info';
    statusMsg.style.display = 'block';
  }

  function renderPlan(plan) {
    document.getElementById('prakriti-type-badge').textContent = plan.prakriti_type;
    document.getElementById('recommended-foods').textContent   = plan.recommended_foods;
    document.getElementById('avoid-foods').textContent         = plan.avoid_foods;
    document.getElementById('lifestyle-tips').textContent      = plan.lifestyle_tips || '—';

    const note = document.getElementById('customized-note');
    if (plan.customized_at) {
      const date = new Date(plan.customized_at).toLocaleDateString();
      note.textContent    = `This plan was customised by your practitioner on ${date}.`;
      note.style.display  = 'block';
    } else {
      note.style.display  = 'none';
    }

    dietCard.style.display    = 'block';
    generateBtn.style.display = 'none';
    statusMsg.style.display   = 'none';
  }

  async function generatePlan() {
    loadingEl.style.display = 'block';
    generateBtn.disabled    = true;
    statusMsg.style.display = 'none';

    try {
      const res  = await fetch('/api/diet/generate', { method: 'POST', credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          if (data.code === 'prakriti_pending') {
            showInfo('Your Prakriti assessment is pending admin approval. Check back after your practitioner reviews it.');
          } else {
            showInfo(data.error || 'Please complete your Prakriti assessment first.');
          }
          generateBtn.style.display = 'none';
        } else {
          showError(data.error || 'Failed to generate diet plan.');
          generateBtn.disabled = false;
        }
        return;
      }

      renderPlan(data);
    } catch {
      showError('Network error. Please try again.');
      generateBtn.disabled = false;
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  generateBtn.addEventListener('click', generatePlan);

  // On load: attempt to generate (server will return existing or create new)
  loadingEl.style.display = 'block';
  try {
    const res  = await fetch('/api/diet/generate', { method: 'POST', credentials: 'include' });
    const data = await res.json();

    if (res.ok) {
      renderPlan(data);
    } else if (res.status === 422) {
      if (data.code === 'prakriti_pending') {
        showInfo('Your Prakriti assessment is pending admin approval. Check back after your practitioner reviews it.');
      } else {
        showInfo(data.error || 'Please complete your Prakriti assessment first.');
      }
      generateBtn.style.display = 'none';
    } else if (res.status === 401) {
      window.location.href = '/login.html';
    } else {
      showError(data.error || 'Could not load diet plan.');
      generateBtn.style.display = 'block';
    }
  } catch {
    showError('Network error. Please try again.');
    generateBtn.style.display = 'block';
  } finally {
    loadingEl.style.display = 'none';
  }
})();
