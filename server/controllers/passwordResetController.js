const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const nodemailer = require('nodemailer');

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * POST /api/auth/forgot-password
 * Accepts { email }, sends reset link if user exists.
 */
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    // Always return success to prevent email enumeration
    const result = await query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!result.rows[0]) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }
    const user = result.rows[0];

    // Invalidate old tokens
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;

    // Send email — throw if it fails
    const mailer = getMailer();
    await mailer.sendMail({
      from: `"AYURCARE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your AYURCARE Password',
      html: `
        <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;background:#FFFDF1;border:1px solid #FFCE99;border-radius:12px;padding:32px;">
          <h2 style="color:#562F00;margin-bottom:8px;">Password Reset Request</h2>
          <p style="color:#8B5E3C;margin-bottom:24px;">Hi ${user.name}, we received a request to reset your AYURCARE password.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:13px 28px;background:#FF9644;color:#562F00;text-decoration:none;border-radius:8px;font-weight:700;font-size:1rem;">Reset Password</a>
          <p style="color:#8B5E3C;font-size:0.85rem;margin-top:24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #FFCE99;margin:20px 0;" />
          <p style="color:#FFCE99;font-size:0.78rem;">AYURCARE · Ayurvedic Health Platform</p>
        </div>
      `,
    });

    return res.json({ message: 'Reset link sent to your email. Please check your inbox.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/reset-password
 * Accepts { token, password }, resets the password.
 */
async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const result = await query(
      `SELECT prt.*, u.id AS uid FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }
    const row = result.rows[0];
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hash, row.uid]);
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [row.id]);
    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/auth/verify-reset-token?token=xxx
 * Checks if a token is valid (for the reset page to validate on load).
 */
async function verifyResetToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const result = await query(
      'SELECT id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    return res.json({ valid: result.rows.length > 0 });
  } catch (err) {
    return res.status(500).json({ valid: false });
  }
}

module.exports = { forgotPassword, resetPassword, verifyResetToken };
