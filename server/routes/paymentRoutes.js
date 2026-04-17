const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  submitPaymentRequest,
  listPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
  getMyRequests,
} = require('../controllers/paymentController');

// Client routes
router.post('/request', requireAuth('client'), submitPaymentRequest);
router.get('/my-requests', requireAuth('client'), getMyRequests);

// Admin routes
router.get('/requests', requireAuth('admin'), listPaymentRequests);
router.post('/requests/:id/approve', requireAuth('admin'), approvePaymentRequest);
router.post('/requests/:id/reject', requireAuth('admin'), rejectPaymentRequest);

module.exports = router;
