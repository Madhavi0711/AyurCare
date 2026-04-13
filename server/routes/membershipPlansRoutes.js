const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { listPlans, createPlan, updatePlan, deletePlan } = require('../controllers/membershipPlansController');

router.get('/', listPlans);                               // public
router.post('/', requireAuth('admin'), createPlan);
router.patch('/:id', requireAuth('admin'), updatePlan);
router.delete('/:id', requireAuth('admin'), deletePlan);

module.exports = router;
