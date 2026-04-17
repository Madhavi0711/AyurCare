const { Router } = require('express');
const { register, login, logout } = require('../controllers/authController');
const { forgotPassword, resetPassword, verifyResetToken } = require('../controllers/passwordResetController');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token', verifyResetToken);

module.exports = router;
