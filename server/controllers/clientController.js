const { findById, updateUser } = require('../models/userModel');
const { query } = require('../db');

/**
 * GET /api/client/dashboard
 * Returns { name, notificationCount } for the authenticated client.
 */
async function getDashboard(req, res) {
  try {
    const userId = req.session.user.id;

    const [notifResult, prakritiResult, userResult] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]),
      query('SELECT status, dominant_type FROM prakriti_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]),
      query('SELECT membership_type, membership_tier FROM users WHERE id = $1', [userId]),
    ]);

    const notificationCount = parseInt(notifResult.rows[0].count, 10);
    const prakriti = prakritiResult.rows[0] || null;
    const membership_type = userResult.rows[0] ? userResult.rows[0].membership_type : 'free';
    const membership_tier = userResult.rows[0] ? userResult.rows[0].membership_tier : 'free';

    return res.json({
      name: req.session.user.name,
      notificationCount,
      prakritiStatus: prakriti ? prakriti.status : null,
      prakritiType: prakriti ? prakriti.dominant_type : null,
      membership_type,
      membership_tier,
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/profile
 * Returns the full user profile from the users table.
 */
async function getProfile(req, res) {
  try {
    const user = await findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Merge membership_tier from session (always up-to-date after login/upgrade)
    return res.json({
      ...user,
      membership_tier: req.session.user.membership_tier || user.membership_tier || 'free',
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/client/profile
 * Validates and updates the client's profile.
 * Returns 400 with { errors: { field: message } } on invalid input.
 */
async function updateProfile(req, res) {
  const { name } = req.body;
  const errors = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Name is required and cannot be empty.';
    } else if (name.trim().length > 255) {
      errors.name = 'Name must be 255 characters or fewer.';
    }
  } else {
    errors.name = 'Name is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const updated = await updateUser(req.session.user.id, { name: name.trim() });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Keep session in sync
    req.session.user.name = updated.name;
    return res.json(updated);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/notifications
 * Returns all notifications for the user ordered by created_at DESC.
 */
async function getNotifications(req, res) {
  try {
    const result = await query(
      'SELECT id, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/client/notifications/:id/read
 * Sets is_read = true for the specified notification (must belong to the user).
 */
async function markNotificationRead(req, res) {
  const notificationId = parseInt(req.params.id, 10);
  if (isNaN(notificationId)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, is_read',
      [notificationId, req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/plans
 * Returns all subscriptions for the authenticated client with computed
 * status ('active' | 'expired') and renewal_reminder flag.
 */
async function getPlans(req, res) {
  try {
    const userId = req.session.user.id;
    const result = await query(
      `SELECT id, plan_name, valid_from, valid_until, payment_status,
              CASE WHEN valid_until < CURRENT_DATE THEN 'expired' ELSE 'active' END AS status,
              (valid_until >= CURRENT_DATE AND valid_until <= CURRENT_DATE + INTERVAL '7 days') AS renewal_reminder
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY valid_until DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getPlans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/goals
 * Returns the user's saved wellness goals.
 */
async function getGoals(req, res) {
  try {
    const result = await query(
      'SELECT goals FROM wellness_goals WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.session.user.id]
    );
    return res.json({ goals: result.rows[0] ? result.rows[0].goals : [] });
  } catch (err) {
    console.error('getGoals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/client/goals
 * Saves (upserts) the user's wellness goals.
 */
async function saveGoals(req, res) {
  const { goals } = req.body;
  if (!Array.isArray(goals)) return res.status(400).json({ error: 'goals must be an array' });
  try {
    await query(
      `INSERT INTO wellness_goals (user_id, goals, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET goals = $2, updated_at = NOW()`,
      [req.session.user.id, JSON.stringify(goals)]
    );
    return res.json({ goals });
  } catch (err) {
    console.error('saveGoals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/health-profile
 */
async function getHealthProfile(req, res) {
  try {
    const result = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.session.user.id]
    );
    return res.json(result.rows[0] || {});
  } catch (err) {
    console.error('getHealthProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/client/health-profile
 */
async function saveHealthProfile(req, res) {
  const { age, height_cm, weight_kg, health_issues, complaints } = req.body;
  try {
    await query(
      `INSERT INTO user_profiles (user_id, age, height_cm, weight_kg, health_issues, complaints, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET age=$2, height_cm=$3, weight_kg=$4, health_issues=$5, complaints=$6, updated_at=NOW()`,
      [req.session.user.id, age || null, height_cm || null, weight_kg || null,
       health_issues || '', complaints || '']
    );
    return res.json({ message: 'Profile saved' });
  } catch (err) {
    console.error('saveHealthProfile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/client/settings
 */
async function getSettings(req, res) {
  try {
    const result = await query(
      'SELECT dark_mode, notifications_enabled FROM user_settings WHERE user_id = $1',
      [req.session.user.id]
    );
    return res.json(result.rows[0] || { dark_mode: false, notifications_enabled: true });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/client/settings
 */
async function saveSettings(req, res) {
  const { dark_mode, notifications_enabled } = req.body;
  try {
    await query(
      `INSERT INTO user_settings (user_id, dark_mode, notifications_enabled, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET dark_mode=$2, notifications_enabled=$3, updated_at=NOW()`,
      [req.session.user.id,
       dark_mode === true || dark_mode === 'true',
       notifications_enabled !== false && notifications_enabled !== 'false']
    );
    return res.json({ message: 'Settings saved' });
  } catch (err) {
    console.error('saveSettings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/client/notifications/read-all
 */
async function markAllNotificationsRead(req, res) {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.session.user.id]
    );
    return res.json({ message: 'All marked read' });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPlans,
  getGoals,
  saveGoals,
  getHealthProfile,
  saveHealthProfile,
  getSettings,
  saveSettings,
};
