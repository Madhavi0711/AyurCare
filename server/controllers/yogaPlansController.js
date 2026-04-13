const { query } = require('../db');

/** GET /api/yoga-plans — public */
async function listPlans(req, res) {
  try {
    const result = await query(`SELECT * FROM yoga_plans ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error('listPlans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/yoga-plans — admin only */
async function addPlan(req, res) {
  const { course_name, description, duration, cost, target_audience, includes } = req.body;
  if (!course_name) return res.status(400).json({ error: 'course_name is required' });
  try {
    const result = await query(
      `INSERT INTO yoga_plans (course_name, description, duration, cost, target_audience, includes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [course_name, description || null, duration || null, cost || 0, target_audience || null, includes || null, req.session.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** PATCH /api/yoga-plans/:id — admin only */
async function updatePlan(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { course_name, description, duration, cost, target_audience, includes } = req.body;
  try {
    const existing = await query(`SELECT * FROM yoga_plans WHERE id = $1`, [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const p = existing.rows[0];
    const result = await query(
      `UPDATE yoga_plans SET course_name=$1, description=$2, duration=$3, cost=$4,
       target_audience=$5, includes=$6 WHERE id=$7 RETURNING *`,
      [
        course_name || p.course_name,
        description !== undefined ? description : p.description,
        duration !== undefined ? duration : p.duration,
        cost !== undefined ? cost : p.cost,
        target_audience !== undefined ? target_audience : p.target_audience,
        includes !== undefined ? includes : p.includes,
        id,
      ]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updatePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/yoga-plans/:id — admin only */
async function deletePlan(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const result = await query(`DELETE FROM yoga_plans WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deletePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listPlans, addPlan, updatePlan, deletePlan };
