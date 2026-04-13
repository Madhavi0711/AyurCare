const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  getDashboard,
  listClients,
  searchClients,
  getClientDetail,
  listPendingPrakriti,
  listAllPrakriti,
  approvePrakriti,
  modifyPrakriti,
  listDietClients,
  assignDietPlan,
  getReports,
  exportReports,
  getAnalytics,
} = require('../controllers/adminController');
const { customizeDiet } = require('../controllers/dietController');
const { listSessions, uploadContent, updateSession } = require('../controllers/yogaController');

// All admin routes require admin role
router.use(requireAuth('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Client Management
router.get('/clients/search', searchClients);   // must be before /:id
router.get('/clients/:id', getClientDetail);
router.get('/clients', listClients);
router.patch('/clients/:id/membership', async (req, res) => {
  const { query } = require('../db');
  const id = parseInt(req.params.id, 10);
  const { membership_type } = req.body;
  if (!['free', 'paid'].includes(membership_type)) {
    return res.status(400).json({ error: 'membership_type must be free or paid' });
  }
  try {
    await query(`UPDATE users SET membership_type = $1 WHERE id = $2`, [membership_type, id]);
    return res.json({ message: 'Updated' });
  } catch (err) {
    console.error('membership update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Prakriti Management
router.get('/prakriti/all', listAllPrakriti);
router.get('/prakriti/pending', listPendingPrakriti);
router.patch('/prakriti/:id/approve', approvePrakriti);
router.patch('/prakriti/:id/modify', modifyPrakriti);

// Diet Management
router.get('/diet/clients', listDietClients);
router.patch('/diet/:id/customize', customizeDiet);
router.post('/diet/assign', assignDietPlan);

// Yoga Management
router.get('/yoga/sessions', listSessions);
router.post('/yoga/upload', uploadContent);
router.patch('/yoga/session/:id', updateSession);
router.delete('/yoga/session/:id', async (req, res) => {
  const { query } = require('../db');
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const result = await query('DELETE FROM yoga_sessions WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Session not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteSession error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Assign a yoga session to a specific client (admin)
router.post('/yoga/assign', async (req, res) => {
  const { query } = require('../db');
  const { user_id, yoga_session_id } = req.body;
  if (!user_id || !yoga_session_id) return res.status(400).json({ error: 'user_id and yoga_session_id are required' });
  try {
    const result = await query(
      `INSERT INTO yoga_plan_assignments (user_id, yoga_session_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING *`,
      [user_id, yoga_session_id]
    );
    // Send notification
    await query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [user_id, 'A new yoga session has been assigned to your plan by your practitioner.']
    );
    return res.status(201).json(result.rows[0] || { message: 'Already assigned' });
  } catch (err) {
    console.error('adminAssignYoga error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics
router.get('/analytics', getAnalytics);

// Reports
router.get('/reports/export', exportReports);   // must be before /reports
router.get('/reports', getReports);

module.exports = router;
