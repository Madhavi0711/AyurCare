const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { submitQuestionnaire, getResult, approveResult, listAllResults, retakeAssessment } = require('../controllers/prakritiController');
const prakritiQuestions = require('../data/prakritiQuestions');

// Public: return question list — no auth required
router.get('/questions', (req, res) => {
  try {
    const sanitized = prakritiQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      answers: q.answers.map((a) => ({ value: a.value, text: a.text })),
    }));
    return res.json(sanitized);
  } catch (err) {
    console.error('GET /questions error:', err);
    return res.status(500).json({ error: 'Failed to load questions' });
  }
});

// Client routes
router.post('/submit', requireAuth('client'), submitQuestionnaire);
router.get('/result', requireAuth('client'), getResult);
router.delete('/retake', requireAuth('client'), retakeAssessment);

// Admin routes
router.get('/', requireAuth('admin'), listAllResults);
router.patch('/:id/approve', requireAuth('admin'), approveResult);

module.exports = router;
