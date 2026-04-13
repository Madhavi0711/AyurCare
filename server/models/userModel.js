const { query } = require('../db');

async function createUser({ name, email, password, role = 'client' }) {
  const result = await query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name, email, password, role]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    'SELECT id, name, email, role, membership_type, membership_tier, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function updateUser(id, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findById(id);
  // Build parameterised SET clause: "name = $2, email = $3" etc.
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [id, ...keys.map((k) => fields[k])];
  const result = await query(
    'UPDATE users SET ' + setClause + ' WHERE id = $1 RETURNING id, name, email, role',
    values
  );
  return result.rows[0] || null;
}

module.exports = { createUser, findByEmail, findById, updateUser };
