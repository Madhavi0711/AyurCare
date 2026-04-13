const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireTier = require('../middleware/requireTier');
const { generateDiet, customizeDiet } = require('../controllers/dietController');

// POST /api/diet/generate — gold or above
router.post('/generate', requireAuth('client'), requireTier('gold'), generateDiet);

// PATCH /api/diet/:id/customize — admin only
router.patch('/:id/customize', requireAuth('admin'), customizeDiet);

module.exports = router;
