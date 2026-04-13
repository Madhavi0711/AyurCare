const { query } = require('../db');

/** GET /api/membership-plans — public */
async function listPlans(req, res) {
  try {
    const result = await query(
      `SELECT * FROM membership_plans WHERE is_active = TRUE ORDER BY price ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('listMembershipPlans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/membership-plans — admin only */
async function createPlan(req, res) {
  const { name, price, duration, description, features } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await query(
      `INSERT INTO membership_plans (name, price, duration, description, features, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, price || 0, duration || 'monthly', description || null,
       JSON.stringify(Array.isArray(features) ? features : []), req.session.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createMembershipPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** PATCH /api/membership-plans/:id — admin only */
async function updatePlan(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { name, price, duration, description, features, is_active } = req.body;
  try {
    const existing = await query(`SELECT * FROM membership_plans WHERE id = $1`, [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const p = existing.rows[0];
    const result = await query(
      `UPDATE membership_plans SET name=$1, price=$2, duration=$3, description=$4, features=$5, is_active=$6
       WHERE id=$7 RETURNING *`,
      [
        name !== undefined ? name : p.name,
        price !== undefined ? price : p.price,
        duration !== undefined ? duration : p.duration,
        description !== undefined ? description : p.description,
        features !== undefined ? JSON.stringify(Array.isArray(features) ? features : []) : p.features,
        is_active !== undefined ? is_active : p.is_active,
        id,
      ]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMembershipPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/membership-plans/:id — admin only */
async function deletePlan(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const result = await query(`DELETE FROM membership_plans WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteMembershipPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listPlans, createPlan, updatePlan, deletePlan };
