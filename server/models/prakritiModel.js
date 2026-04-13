const { query } = require('../db');

/**
 * Insert a new Prakriti result row.
 * @param {{ user_id, answers, vata_score, pitta_score, kapha_score, dominant_type }} data
 */
async function insertResult({ user_id, answers, vata_score, pitta_score, kapha_score, dominant_type }) {
  const result = await query(
    `INSERT INTO prakriti_results (user_id, answers, vata_score, pitta_score, kapha_score, dominant_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user_id, JSON.stringify(answers ?? null), vata_score, pitta_score, kapha_score, dominant_type]
  );
  return result.rows[0];
}

/**
 * Find the most recent Prakriti result for a user.
 */
async function findByUserId(userId) {
  const result = await query(
    `SELECT * FROM prakriti_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Update the status of a Prakriti result to 'approved'.
 */
async function updateStatus(id, approvedBy) {
  const result = await query(
    `UPDATE prakriti_results
     SET status = 'approved', approved_by = $2, approved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, approvedBy]
  );
  return result.rows[0] || null;
}

module.exports = { insertResult, findByUserId, updateStatus };
