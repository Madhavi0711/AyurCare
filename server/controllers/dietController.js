const { query, withTransaction } = require('../db');
const dietTemplates = require('../data/dietTemplates');

/**
 * POST /api/diet/generate  (client-only)
 * Fetch the most recent approved Prakriti result for the authenticated client,
 * look up the matching diet template, persist a diet_recommendations row, and
 * return the new row.
 */
async function generateDiet(req, res) {
  const userId = req.session.user.id;

  try {
    // Check if any prakriti result exists (regardless of status)
    const anyPrakriti = await query(
      `SELECT status FROM prakriti_results
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (anyPrakriti.rows.length === 0) {
      return res.status(422).json({ error: 'Complete Prakriti assessment first', code: 'no_prakriti' });
    }

    if (anyPrakriti.rows[0].status !== 'approved') {
      return res.status(422).json({ error: 'Your Prakriti assessment is pending admin approval.', code: 'prakriti_pending' });
    }

    // Fetch most recent approved Prakriti result
    const prakritiResult = await query(
      `SELECT * FROM prakriti_results
       WHERE user_id = $1 AND status = 'approved'
       ORDER BY approved_at DESC
       LIMIT 1`,
      [userId]
    );

    const { dominant_type } = prakritiResult.rows[0];
    const template = dietTemplates[dominant_type];

    // Check if a diet recommendation already exists for this user
    const existing = await query(
      `SELECT * FROM diet_recommendations
       WHERE customized_for = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0]);
    }

    // Insert diet_recommendations row
    const inserted = await query(
      `INSERT INTO diet_recommendations
         (prakriti_type, recommended_foods, avoid_foods, lifestyle_tips, customized_for)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        template.prakriti_type,
        template.recommended_foods,
        template.avoid_foods,
        template.lifestyle_tips,
        userId,
      ]
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error('generateDiet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/diet/:id/customize  (admin-only)
 * Update an existing diet_recommendations row with customized content,
 * record the admin's id and timestamp, and notify the client.
 */
async function customizeDiet(req, res) {
  const adminId = req.session.user.id;
  const dietId = parseInt(req.params.id, 10);
  const { recommended_foods, avoid_foods, lifestyle_tips } = req.body;

  if (!recommended_foods || !avoid_foods) {
    return res.status(400).json({ error: 'recommended_foods and avoid_foods are required' });
  }

  try {
    const dietRow = await withTransaction(async (client) => {
      // Update the diet row
      const updated = await client.query(
        `UPDATE diet_recommendations
         SET recommended_foods = $1,
             avoid_foods       = $2,
             lifestyle_tips    = $3,
             customized_by     = $4,
             customized_at     = NOW()
         WHERE id = $5
         RETURNING *`,
        [recommended_foods, avoid_foods, lifestyle_tips || null, adminId, dietId]
      );

      if (updated.rows.length === 0) return null;

      const row = updated.rows[0];

      // Notify the client whose plan was customized
      if (row.customized_for) {
        await client.query(
          `INSERT INTO notifications (user_id, message)
           VALUES ($1, $2)`,
          [
            row.customized_for,
            'Your diet plan has been customized by your practitioner.',
          ]
        );
      }

      return row;
    });

    if (!dietRow) {
      return res.status(404).json({ error: 'Diet plan not found' });
    }

    return res.json(dietRow);
  } catch (err) {
    console.error('customizeDiet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { generateDiet, customizeDiet };
