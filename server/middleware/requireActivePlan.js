const { query } = require('../db');

/**
 * requireActivePlan — middleware that checks if the authenticated client
 * has at least one active (non-expired) subscription.
 * Returns 403 if no active plan exists.
 */
async function requireActivePlan(req, res, next) {
  try {
    const userId = req.session.user.id;
    const result = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND valid_until >= CURRENT_DATE
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Active plan required', status: 'expired' });
    }

    next();
  } catch (err) {
    console.error('requireActivePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = requireActivePlan;
