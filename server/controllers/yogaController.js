const { query } = require('../db');

function isValidUrl(str) {
  return /^https?:\/\/.+/.test(str);
}

async function listSessions(req, res) {
  const { category } = req.query;
  try {
    let sql = 'SELECT * FROM yoga_sessions';
    const params = [];
    if (category) { sql += ' WHERE category = $1'; params.push(category); }
    sql += ' ORDER BY category, created_at DESC';
    const result = await query(sql, params);
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    }
    return res.json({ sessions: result.rows, grouped });
  } catch (err) {
    console.error('listSessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function assignPlan(req, res) {
  const userId = req.session.user.id;
  const { yoga_session_id } = req.body;
  if (!yoga_session_id) return res.status(400).json({ error: 'yoga_session_id is required' });
  try {
    const sessionCheck = await query('SELECT id FROM yoga_sessions WHERE id = $1', [yoga_session_id]);
    if (sessionCheck.rows.length === 0) return res.status(404).json({ error: 'Yoga session not found' });
    const result = await query(
      `INSERT INTO yoga_plan_assignments (user_id, yoga_session_id) VALUES ($1, $2) RETURNING *`,
      [userId, yoga_session_id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('assignPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function logProgress(req, res) {
  const userId = req.session.user.id;
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { progress_notes } = req.body;
  if (!progress_notes) return res.status(400).json({ error: 'progress_notes is required' });
  try {
    const result = await query(
      `UPDATE yoga_plan_assignments SET progress_notes = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [progress_notes, assignmentId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('logProgress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function uploadContent(req, res) {
  const { title, category, description, video_link, therapist_name } = req.body;
  const errors = [];
  if (!title || typeof title !== 'string' || title.trim() === '') errors.push('title is required and must be a non-empty string');
  if (!category || typeof category !== 'string' || category.trim() === '') errors.push('category is required and must be a non-empty string');
  if (video_link && !isValidUrl(video_link)) errors.push('video_link must be a valid URL starting with http:// or https://');
  if (errors.length > 0) return res.status(400).json({ error: 'Invalid content format', details: errors });
  try {
    const result = await query(
      `INSERT INTO yoga_sessions (title, category, description, video_link, therapist_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), category.trim(), description || null, video_link || null, therapist_name || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('uploadContent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateSession(req, res) {
  const sessionId = parseInt(req.params.id, 10);
  const { title, category, description, video_link, therapist_name } = req.body;
  const errors = [];
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) errors.push('title must be a non-empty string');
  if (category !== undefined && (typeof category !== 'string' || category.trim() === '')) errors.push('category must be a non-empty string');
  if (video_link !== undefined && video_link !== null && !isValidUrl(video_link)) errors.push('video_link must be a valid URL starting with http:// or https://');
  if (errors.length > 0) return res.status(400).json({ error: 'Invalid content format', details: errors });

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined)          { fields.push('title = $' + idx++);          values.push(title.trim()); }
    if (category !== undefined)       { fields.push('category = $' + idx++);       values.push(category.trim()); }
    if (description !== undefined)    { fields.push('description = $' + idx++);    values.push(description); }
    if (video_link !== undefined)     { fields.push('video_link = $' + idx++);     values.push(video_link); }
    if (therapist_name !== undefined) { fields.push('therapist_name = $' + idx++); values.push(therapist_name); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields provided to update' });

    values.push(sessionId);
    const result = await query(
      'UPDATE yoga_sessions SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *',
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Yoga session not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateSession error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listAssignments(req, res) {
  const userId = req.session.user.id;
  try {
    const result = await query(
      `SELECT a.id, a.assigned_at, a.progress_notes,
              s.id AS yoga_session_id, s.title, s.category,
              s.description, s.video_link, s.therapist_name
       FROM yoga_plan_assignments a
       JOIN yoga_sessions s ON s.id = a.yoga_session_id
       WHERE a.user_id = $1 ORDER BY a.assigned_at DESC`,
      [userId]
    );
    return res.json({ assignments: result.rows });
  } catch (err) {
    console.error('listAssignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listSessions, assignPlan, logProgress, uploadContent, updateSession, listAssignments };
