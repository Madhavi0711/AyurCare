const prakritiQuestions = require('../data/prakritiQuestions');
const { insertResult, findByUserId, updateStatus } = require('../models/prakritiModel');
const { withTransaction, query: dbQuery } = require('../db');

// ── Core scoring logic ────────────────────────────────────────────────────────

/**
 * identify_prakriti — accepts an array of answers like ['A','B','C',...]
 * where A=Vata, B=Pitta, C=Kapha.
 *
 * Returns:
 *   { dominant, scores: { vata, pitta, kapha } }
 *
 * Combined types (e.g. "Vata-Pitta") are returned when two doshas tie for highest.
 * "Balanced Prakriti" is returned when all three are equal.
 */
function identify_prakriti(user_answers) {
  let vata = 0;
  let pitta = 0;
  let kapha = 0;

  for (const ans of user_answers) {
    const upper = String(ans).toUpperCase();
    if (upper === 'A') vata++;
    else if (upper === 'B') pitta++;
    else if (upper === 'C') kapha++;
  }

  const max = Math.max(vata, pitta, kapha);
  let dominant;

  if (vata === pitta && pitta === kapha) {
    dominant = 'Balanced Prakriti';
  } else if (vata === max && pitta === max) {
    dominant = 'Vata-Pitta';
  } else if (vata === max && kapha === max) {
    dominant = 'Vata-Kapha';
  } else if (pitta === max && kapha === max) {
    dominant = 'Pitta-Kapha';
  } else if (vata === max) {
    dominant = 'Vata';
  } else if (pitta === max) {
    dominant = 'Pitta';
  } else {
    dominant = 'Kapha';
  }

  return { dominant, scores: { vata, pitta, kapha } };
}

/**
 * computeScores — legacy weight-based scoring from the question data file.
 * Accepts { [questionId]: answerValue } object format.
 */
function computeScores(answers) {
  let vata = 0;
  let pitta = 0;
  let kapha = 0;

  for (const question of prakritiQuestions) {
    const chosen = answers[String(question.id)];
    const answerObj = question.answers.find((a) => a.value === chosen);
    if (answerObj) {
      vata  += answerObj.weights.vata;
      pitta += answerObj.weights.pitta;
      kapha += answerObj.weights.kapha;
    }
  }

  const result = identify_prakriti(
    // Convert weight totals back to a comparable array representation
    // by using the raw counts directly
    Object.assign([], { length: 0 })
  );

  // For weight-based scoring, determine dominant directly
  const max = Math.max(vata, pitta, kapha);
  let dominant_type;
  if (vata === pitta && pitta === kapha) {
    dominant_type = 'Balanced Prakriti';
  } else if (vata === max && pitta === max) {
    dominant_type = 'Vata-Pitta';
  } else if (vata === max && kapha === max) {
    dominant_type = 'Vata-Kapha';
  } else if (pitta === max && kapha === max) {
    dominant_type = 'Pitta-Kapha';
  } else if (vata === max) {
    dominant_type = 'Vata';
  } else if (pitta === max) {
    dominant_type = 'Pitta';
  } else {
    dominant_type = 'Kapha';
  }

  return { vata_score: vata, pitta_score: pitta, kapha_score: kapha, dominant_type };
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/prakriti/submit
 *
 * Accepts two formats:
 *   1. Array format (new):  { answers: ['A','B','C',...] }
 *   2. Object format (old): { answers: { "1": "a", "2": "b", ... } }
 */
async function submitQuestionnaire(req, res) {
  const { answers } = req.body;

  if (!answers) {
    return res.status(400).json({ errors: { answers: 'Answers are required' } });
  }

  let vata_score, pitta_score, kapha_score, dominant_type, answersArray;

  // ── Array format: ['A','B','C',...] ──────────────────────────────────────
  if (Array.isArray(answers)) {
    if (answers.length !== prakritiQuestions.length) {
      return res.status(400).json({
        errors: { answers: `Expected ${prakritiQuestions.length} answers, got ${answers.length}` },
      });
    }

    const valid = answers.every((a) => ['A', 'B', 'C', 'a', 'b', 'c'].includes(a));
    if (!valid) {
      return res.status(400).json({ errors: { answers: 'Each answer must be A, B, or C' } });
    }

    answersArray = answers.map((a) => a.toUpperCase());
    const result = identify_prakriti(answersArray);
    vata_score    = result.scores.vata;
    pitta_score   = result.scores.pitta;
    kapha_score   = result.scores.kapha;
    dominant_type = result.dominant;

  // ── Object format: { "1": "a", ... } ────────────────────────────────────
  } else if (typeof answers === 'object') {
    const unanswered = prakritiQuestions
      .map((q) => q.id)
      .filter((id) => {
        const val = answers[String(id)];
        return val === undefined || val === null || val === '';
      });

    if (unanswered.length > 0) {
      return res.status(400).json({ errors: { unanswered } });
    }

    const scores = computeScores(answers);
    vata_score    = scores.vata_score;
    pitta_score   = scores.pitta_score;
    kapha_score   = scores.kapha_score;
    dominant_type = scores.dominant_type;

    // Convert to array for storage
    answersArray = prakritiQuestions.map((q) => {
      const val = answers[String(q.id)];
      if (val === 'a') return 'A';
      if (val === 'b') return 'B';
      if (val === 'c') return 'C';
      return val;
    });

  } else {
    return res.status(400).json({ errors: { answers: 'Invalid answers format' } });
  }

  try {
    const row = await insertResult({
      user_id: req.session.user.id,
      answers: answersArray,
      vata_score,
      pitta_score,
      kapha_score,
      dominant_type,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('submitQuestionnaire error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/prakriti/result
 * Returns the most recent Prakriti result for the authenticated client.
 */
async function getResult(req, res) {
  try {
    const row = await findByUserId(req.session.user.id);
    if (!row) {
      return res.status(404).json({ error: 'No Prakriti result found' });
    }
    return res.json(row);
  } catch (err) {
    console.error('getResult error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/prakriti/:id/approve  (admin-only)
 */
async function approveResult(req, res) {
  const resultId = parseInt(req.params.id, 10);
  if (isNaN(resultId)) {
    return res.status(400).json({ error: 'Invalid result ID' });
  }

  try {
    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE prakriti_results
         SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.session.user.id, resultId]
      );
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      await client.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
        [row.user_id, `Your Prakriti assessment has been approved. Your dominant type is ${row.dominant_type}.`]
      );
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: 'Prakriti result not found' });
    }
    return res.json(updated);
  } catch (err) {
    console.error('approveResult error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/prakriti  (admin-only)
 * Returns all prakriti results joined with user name and email.
 */
async function listAllResults(req, res) {
  try {
    const result = await dbQuery(
      `SELECT pr.id, pr.user_id, u.name, u.email,
              pr.answers, pr.vata_score, pr.pitta_score, pr.kapha_score,
              pr.dominant_type, pr.status, pr.created_at
       FROM prakriti_results pr
       JOIN users u ON u.id = pr.user_id
       ORDER BY pr.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('listAllResults error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/prakriti/retake  (client-only)
 * Deletes the user's existing prakriti result so they can retake the quiz.
 */
async function retakeAssessment(req, res) {
  try {
    await dbQuery(
      `DELETE FROM prakriti_results WHERE user_id = $1`,
      [req.session.user.id]
    );
    return res.json({ message: 'Assessment reset. You can now retake the quiz.' });
  } catch (err) {
    console.error('retakeAssessment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { submitQuestionnaire, getResult, approveResult, computeScores, identify_prakriti, listAllResults, retakeAssessment };
