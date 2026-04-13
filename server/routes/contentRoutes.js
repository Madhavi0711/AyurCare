const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireTier = require('../middleware/requireTier');
const { listContent, addContent, deleteContent } = require('../controllers/contentController');

// Platinum clients or admin can view content
router.get('/', requireAuth(), (req, res, next) => {
  const user = req.session.user;
  if (user.role === 'admin') return next();
  const tier = user.membership_tier || 'free';
  if (tier !== 'platinum') {
    return res.status(403).json({ error: 'upgrade_required', required_tier: 'platinum', message: 'Upgrade to Platinum to access premium content.' });
  }
  next();
}, listContent);

// Admin only: add / delete
router.post('/', requireAuth('admin'), addContent);
router.delete('/:id', requireAuth('admin'), deleteContent);

module.exports = router;
