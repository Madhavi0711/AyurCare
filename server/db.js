require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ayurcare',
  user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

/**
 * Execute a SQL query against the pool.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(sql, params) {
  return pool.query(sql, params);
}

/**
 * Run `fn(client)` inside a BEGIN/COMMIT transaction.
 * Rolls back and rethrows on error; always releases the client.
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
