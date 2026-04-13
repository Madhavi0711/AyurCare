const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { listPlans, addPlan, updatePlan, deletePlan } = require('../controllers/yogaPlansController');

router.get('/', listPlans);                              // public
router.post('/', requireAuth('admin'), addPlan);
router.patch('/:id', requireAuth('admin'), updatePlan);
router.delete('/:id', requireAuth('admin'), deletePlan);

module.exports = router;
