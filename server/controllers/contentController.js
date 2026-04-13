const { query } = require('../db');

/** GET /api/content — paid clients or admin */
async function listContent(req, res) {
  const { type } = req.query;
  try {
    let sql = `SELECT id, title, type, file_url, description, created_at FROM content`;
    const params = [];
    if (type && type.trim()) { sql += ` WHERE type = $1`; params.push(type.trim()); }
    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('listContent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/content — admin only */
async function addContent(req, res) {
  const { title, type, file_url, description } = req.body;
  if (!title || !type || !file_url) {
    return res.status(400).json({ error: 'title, type, and file_url are required' });
  }
  if (!['video', 'notes', 'diet'].includes(type)) {
    return res.status(400).json({ error: 'type must be video, notes, or diet' });
  }
  try {
    const result = await query(
      `INSERT INTO content (title, type, file_url, description, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, type, file_url, description || null, req.session.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addContent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** DELETE /api/content/:id — admin only */
async function deleteContent(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const result = await query(`DELETE FROM content WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Content not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteContent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listContent, addContent, deleteContent };
