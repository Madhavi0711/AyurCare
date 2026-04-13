/**
 * prakriti.js
 * One-question-at-a-time Prakriti quiz.
 * Answers stored as ['A','B','C',...] and submitted to POST /api/prakriti/submit
 */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let questions   = [];
  let currentIdx  = 0;
  let userAnswers = []; // ['A','B','C',...]

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const quizSection    = document.getElementById('quiz-section');
  const resultSection  = document.getElementById('result-section');
  const progressEl     = document.getElementById('quiz-progress');
  const progressBar    = document.getElementById('progress-bar');
  const questionText   = document.getElementById('question-text');
  const optionsEl      = document.getElementById('options-container');
  const prevBtn        = document.getElementById('prev-btn');
  const nextBtn        = document.getElementById('next-btn');
  const submitBtn      = document.getElementById('submit-btn');
  const statusMsg      = document.getElementById('status-msg');
  const loadingEl      = document.getElementById('loading');

  // Result elements
  const vataScoreEl    = document.getElementById('vata-score');
  const pittaScoreEl   = document.getElementById('pitta-score');
  const kaphaScoreEl   = document.getElementById('kapha-score');
  const dominantEl     = document.getElementById('dominant-type');
  const resultStatusEl = document.getElementById('result-status');
  const retakeBtn      = document.getElementById('retake-btn');

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showMsg(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className   = 'status-msg ' + (type || 'info');
    statusMsg.style.display = 'block';
  }
  function clearMsg() {
    statusMsg.style.display = 'none';
    statusMsg.textContent   = '';
  }

  // ── Render a single question ───────────────────────────────────────────────
  function renderQuestion() {
    clearMsg();
    const q   = questions[currentIdx];
    const num = currentIdx + 1;
    const total = questions.length;

    progressEl.textContent = `Question ${num} of ${total}`;
    progressBar.style.width = Math.round((num / total) * 100) + '%';
    progressBar.setAttribute('aria-valuenow', num);

    questionText.textContent = `${num}. ${q.text}`;

    // Map answer values a/b/c → A/B/C labels
    const labelMap = { a: 'A', b: 'B', c: 'C' };

    optionsEl.innerHTML = '';
    q.answers.forEach((ans) => {
      const letter = labelMap[ans.value] || ans.value.toUpperCase();
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'option-btn';
      btn.dataset.value = letter;

      // Highlight if already answered
      if (userAnswers[currentIdx] === letter) {
        btn.classList.add('selected');
      }

      btn.innerHTML = `<span class="option-letter">${letter}</span><span class="option-text">${ans.text}</span>`;
      btn.addEventListener('click', () => selectAnswer(letter));
      optionsEl.appendChild(btn);
    });

    // Nav buttons
    prevBtn.disabled   = currentIdx === 0;
    nextBtn.style.display   = currentIdx < total - 1 ? 'inline-flex' : 'none';
    submitBtn.style.display = currentIdx === total - 1 ? 'inline-flex' : 'none';
  }

  function selectAnswer(letter) {
    userAnswers[currentIdx] = letter;

    // Update button highlight
    optionsEl.querySelectorAll('.option-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.value === letter);
    });

    clearMsg();

    // Auto-advance if not last question
    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        currentIdx++;
        renderQuestion();
      }, 300);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  prevBtn.addEventListener('click', () => {
    if (currentIdx > 0) {
      currentIdx--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (!userAnswers[currentIdx]) {
      showMsg('Please select an answer before continuing.', 'error');
      return;
    }
    currentIdx++;
    renderQuestion();
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    if (!userAnswers[currentIdx]) {
      showMsg('Please select an answer before submitting.', 'error');
      return;
    }

    // Check all answered
    const unanswered = [];
    for (let i = 0; i < questions.length; i++) {
      if (!userAnswers[i]) unanswered.push(i + 1);
    }
    if (unanswered.length > 0) {
      showMsg(`Please answer all questions. Missing: ${unanswered.join(', ')}`, 'error');
      return;
    }

    submitBtn.disabled  = true;
    loadingEl.style.display = 'block';
    clearMsg();

    try {
      const res = await fetch('/api/prakriti/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: userAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Submission failed. Please try again.', 'error');
        return;
      }

      showResult(data);
    } catch (_) {
      showMsg('Network error. Please try again.', 'error');
    } finally {
      submitBtn.disabled      = false;
      loadingEl.style.display = 'none';
    }
  });

  // ── Show result ────────────────────────────────────────────────────────────
  function showResult(data) {
    const vata  = data.vata_score  || 0;
    const pitta = data.pitta_score || 0;
    const kapha = data.kapha_score || 0;
    const total = vata + pitta + kapha || 1; // avoid div/0

    // Score numbers
    if (vataScoreEl)  vataScoreEl.textContent  = vata;
    if (pittaScoreEl) pittaScoreEl.textContent = pitta;
    if (kaphaScoreEl) kaphaScoreEl.textContent = kapha;

    // Score bars
    const vataBar  = document.getElementById('vata-bar');
    const pittaBar = document.getElementById('pitta-bar');
    const kaphaBar = document.getElementById('kapha-bar');
    if (vataBar)  vataBar.style.width  = Math.round((vata  / total) * 100) + '%';
    if (pittaBar) pittaBar.style.width = Math.round((pitta / total) * 100) + '%';
    if (kaphaBar) kaphaBar.style.width = Math.round((kapha / total) * 100) + '%';

    if (dominantEl) dominantEl.textContent = data.dominant_type || '—';

    if (resultStatusEl) {
      const date = data.created_at ? new Date(data.created_at).toLocaleDateString() : '';
      resultStatusEl.textContent = `Status: ${data.status || 'pending'}${date ? ' — Assessed on ' + date : ''}`;
    }

    quizSection.style.display   = 'none';
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Retake ─────────────────────────────────────────────────────────────────
  if (retakeBtn) {
    retakeBtn.addEventListener('click', async () => {
      retakeBtn.disabled = true;
      retakeBtn.textContent = 'Resetting…';
      try {
        const res = await fetch('/api/prakriti/retake', {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showMsg(data.error || 'Failed to reset assessment.', 'error');
          retakeBtn.disabled = false;
          retakeBtn.textContent = 'Retake Assessment';
          return;
        }
      } catch (_) {
        showMsg('Network error. Please try again.', 'error');
        retakeBtn.disabled = false;
        retakeBtn.textContent = 'Retake Assessment';
        return;
      }

      // Reset state and reload questions
      userAnswers = [];
      currentIdx  = 0;
      resultSection.style.display = 'none';
      retakeBtn.disabled = false;
      retakeBtn.textContent = 'Retake Assessment';

      // Reload questions fresh
      loadingEl.style.display = 'block';
      try {
        const res = await fetch('/api/prakriti/questions');
        if (!res.ok) throw new Error('Failed to reload questions');
        questions   = await res.json();
        userAnswers = new Array(questions.length).fill(null);
        loadingEl.style.display   = 'none';
        quizSection.style.display = 'block';
        renderQuestion();
      } catch (err) {
        loadingEl.style.display = 'none';
        showMsg('Failed to reload questions. Please refresh the page.', 'error');
      }
    });
  }

  // ── Load questions & check existing result ─────────────────────────────────
  async function init() {
    loadingEl.style.display = 'block';

    // Step 1: Load questions first (public endpoint, always works)
    let loadedQuestions = [];
    try {
      const res = await fetch('/api/prakriti/questions');
      if (!res.ok) throw new Error('Server error: ' + res.status);
      loadedQuestions = await res.json();
      if (!Array.isArray(loadedQuestions) || loadedQuestions.length === 0) {
        throw new Error('No questions returned from server');
      }
    } catch (err) {
      loadingEl.style.display = 'none';
      showMsg('Failed to load questionnaire: ' + err.message + '. Please refresh the page.', 'error');
      return;
    }

    // Step 2: Check if user already has a result (requires auth — 401 means not logged in)
    try {
      const res = await fetch('/api/prakriti/result', { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        loadingEl.style.display = 'none';
        showResult(data);
        return;
      }
      // 404 = no result yet, fall through to show quiz
    } catch (_) { /* network error, show quiz anyway */ }

    // Step 3: Show quiz
    questions   = loadedQuestions;
    userAnswers = new Array(questions.length).fill(null);
    loadingEl.style.display   = 'none';
    quizSection.style.display = 'block';
    renderQuestion();
  }

  init();
})();
