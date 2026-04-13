const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPlans,
  getGoals,
  saveGoals,
  getHealthProfile,
  saveHealthProfile,
  getSettings,
  saveSettings,
} = require('../controllers/clientController');

const router = Router();

router.use(requireAuth('client'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/plans', getPlans);
router.get('/goals', getGoals);
router.post('/goals', saveGoals);
router.get('/health-profile', getHealthProfile);
router.post('/health-profile', saveHealthProfile);
router.get('/settings', getSettings);
router.post('/settings', saveSettings);

module.exports = router;
