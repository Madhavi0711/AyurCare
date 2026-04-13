const bcrypt = require('bcryptjs');
const { createUser, findByEmail } = require('../models/userModel');

const SALT_ROUNDS = 10;

async function register(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ errors: { message: 'Name, email, and password are required' } });
  }

  try {
    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name, email, password: hash, role: role || 'client' });

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, membership_type: 'free', membership_tier: 'free' };

    const redirect =
      user.role === 'admin'
        ? '/dashboards/adminDashboard.html'
        : '/dashboards/patientDashboard.html';

    return res.status(201).json({ redirect });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ errors: { message: 'Email and password are required' } });
  }

  try {
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, membership_type: user.membership_type || 'free', membership_tier: user.membership_tier || 'free' };

    const redirect =
      user.role === 'admin'
        ? '/dashboards/adminDashboard.html'
        : '/dashboards/patientDashboard.html';

    return res.json({ redirect });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('logout error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
}

module.exports = { register, login, logout };
