const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'ayurcare-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route mounts
app.use('/api', require('./routes/authRoutes'));
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/prakriti', require('./routes/prakritiRoutes'));
app.use('/api/diet', require('./routes/dietRoutes'));
app.use('/api/yoga', require('./routes/yogaRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/yoga-plans', require('./routes/yogaPlansRoutes'));
app.use('/api/membership-plans', require('./routes/membershipPlansRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

// Membership upgrade (simulate payment — sets membership_type to 'paid')
const requireAuth = require('./middleware/requireAuth');
const { query } = require('./db');
app.post('/api/upgrade', requireAuth('client'), async (req, res) => {
  try {
    await query(`UPDATE users SET membership_type = 'paid' WHERE id = $1`, [req.session.user.id]);
    req.session.user.membership_type = 'paid';
    return res.json({ message: 'Upgraded to Premium', membership_type: 'paid' });
  } catch (err) {
    console.error('upgrade error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-create password_reset_tokens table if missing
query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`).catch(err => console.error('password_reset_tokens table error:', err));

// Auto-create payment_requests table if missing
query(`CREATE TABLE IF NOT EXISTS payment_requests (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_tier   VARCHAR(20) NOT NULL CHECK (requested_tier IN ('gold','platinum')),
  transaction_id   VARCHAR(255) NOT NULL,
  payment_platform VARCHAR(100) NOT NULL,
  amount           NUMERIC(10,2),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note       TEXT,
  reviewed_by      INTEGER REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`).catch(err => console.error('payment_requests table error:', err));

// Tiered upgrade — Free / Gold / Platinum
app.post('/api/upgrade-tier', requireAuth('client'), async (req, res) => {
  const { tier } = req.body;
  const validTiers = ['free', 'gold', 'platinum'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be free, gold, or platinum.' });
  }
  try {
    const membershipType = tier === 'free' ? 'free' : 'paid';
    await query(
      `UPDATE users SET membership_tier = $1, membership_type = $2 WHERE id = $3`,
      [tier, membershipType, req.session.user.id]
    );
    req.session.user.membership_tier = tier;
    req.session.user.membership_type = membershipType;
    const labels = { free: 'Free', gold: 'Gold', platinum: 'Platinum' };
    return res.json({ message: `Upgraded to ${labels[tier]}`, membership_tier: tier });
  } catch (err) {
    console.error('upgrade-tier error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AYURCARE server running on port ${PORT}`);
  });
}

module.exports = app;
