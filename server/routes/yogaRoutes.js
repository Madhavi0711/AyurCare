const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireTier = require('../middleware/requireTier');
const {
  listSessions,
  assignPlan,
  logProgress,
  uploadContent,
  updateSession,
  listAssignments,
} = require('../controllers/yogaController');

// GET /api/yoga/sessions — gold or above
router.get('/sessions', requireAuth(), requireTier('gold'), listSessions);

// GET /api/yoga/assignments — gold or above
router.get('/assignments', requireAuth('client'), requireTier('gold'), listAssignments);

// POST /api/yoga/assign — gold or above
router.post('/assign', requireAuth('client'), requireTier('gold'), assignPlan);

// PATCH /api/yoga/progress/:assignmentId — gold or above
router.patch('/progress/:assignmentId', requireAuth('client'), requireTier('gold'), logProgress);

// POST /api/yoga/upload — admin only
router.post('/upload', requireAuth('admin'), uploadContent);

// PATCH /api/yoga/session/:id — admin only
router.patch('/session/:id', requireAuth('admin'), updateSession);

module.exports = router;
