const { query } = require('../db');
const nodemailer = require('nodemailer');

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * POST /api/payment/request
 * Client submits transaction details after paying via QR.
 */
async function submitPaymentRequest(req, res) {
  const { requested_tier, transaction_id, payment_platform, amount } = req.body;
  if (!requested_tier || !transaction_id || !payment_platform) {
    return res.status(400).json({ error: 'requested_tier, transaction_id, and payment_platform are required.' });
  }
  if (!['gold', 'platinum'].includes(requested_tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be gold or platinum.' });
  }
  const userId = req.session.user.id;
  const userName = req.session.user.name;
  const userEmail = req.session.user.email;

  try {
    // Check for existing pending request
    const existing = await query(
      `SELECT id FROM payment_requests WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending payment request. Please wait for admin approval.' });
    }

    const result = await query(
      `INSERT INTO payment_requests (user_id, requested_tier, transaction_id, payment_platform, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, requested_tier, transaction_id, payment_platform, amount || null]
    );
    const request = result.rows[0];

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ayurcare.com';
    const tierLabel = requested_tier.charAt(0).toUpperCase() + requested_tier.slice(1);
    const amountLabel = amount ? `₹${amount}` : 'Not specified';

    try {
      const mailer = getMailer();
      await mailer.sendMail({
        from: `"AYURCARE System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `[AYURCARE] Payment Request — ${userName} → ${tierLabel}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fdf6ec;border:1px solid #e8d5a3;border-radius:12px;padding:32px;">
            <h2 style="color:#5a3e28;margin-bottom:4px;">New Payment Request</h2>
            <p style="color:#7a6a55;margin-bottom:24px;">A user has submitted payment details and is requesting a tier upgrade.</p>
            <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
              <tr><td style="padding:8px 0;color:#7a6a55;width:140px;">User Name</td><td style="padding:8px 0;color:#3b2a1a;font-weight:600;">${userName}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Email</td><td style="padding:8px 0;color:#3b2a1a;">${userEmail}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Requested Tier</td><td style="padding:8px 0;color:#3b2a1a;font-weight:700;">${tierLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Transaction ID</td><td style="padding:8px 0;color:#3b2a1a;">${transaction_id}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Platform</td><td style="padding:8px 0;color:#3b2a1a;">${payment_platform}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Amount</td><td style="padding:8px 0;color:#3b2a1a;">${amountLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#7a6a55;">Request ID</td><td style="padding:8px 0;color:#3b2a1a;">#${request.id}</td></tr>
            </table>
            <div style="margin-top:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e8d5a3;">
              <p style="color:#5a3e28;font-weight:600;margin-bottom:8px;">Action Required</p>
              <p style="color:#7a6a55;font-size:0.9rem;">Log in to the admin dashboard and navigate to <strong>Payment Requests</strong> to approve or reject this request.</p>
            </div>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Email send failed (non-fatal):', mailErr.message);
    }

    return res.status(201).json({ message: 'Payment request submitted. Admin will review and upgrade your account.', id: request.id });
  } catch (err) {
    console.error('submitPaymentRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/payment/requests — admin: list all pending requests
 */
async function listPaymentRequests(req, res) {
  try {
    const result = await query(
      `SELECT pr.*, u.name AS user_name, u.email AS user_email
       FROM payment_requests pr
       JOIN users u ON u.id = pr.user_id
       ORDER BY pr.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('listPaymentRequests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/payment/requests/:id/approve — admin: approve and upgrade tier
 */
async function approvePaymentRequest(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { admin_note } = req.body;

  try {
    const reqResult = await query(`SELECT * FROM payment_requests WHERE id = $1`, [id]);
    const payReq = reqResult.rows[0];
    if (!payReq) return res.status(404).json({ error: 'Request not found' });
    if (payReq.status !== 'pending') return res.status(409).json({ error: 'Request already reviewed' });

    // Upgrade user tier
    const membershipType = 'paid';
    await query(
      `UPDATE users SET membership_tier = $1, membership_type = $2 WHERE id = $3`,
      [payReq.requested_tier, membershipType, payReq.user_id]
    );

    // Mark request approved
    await query(
      `UPDATE payment_requests SET status = 'approved', admin_note = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [admin_note || null, req.session.user.id, id]
    );

    // Notify user via notification
    const tierLabel = payReq.requested_tier.charAt(0).toUpperCase() + payReq.requested_tier.slice(1);
    await query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [payReq.user_id, `Your payment has been verified and your account has been upgraded to ${tierLabel}! Enjoy your new benefits.`]
    );

    return res.json({ message: `User upgraded to ${tierLabel}` });
  } catch (err) {
    console.error('approvePaymentRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/payment/requests/:id/reject — admin: reject request
 */
async function rejectPaymentRequest(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { admin_note } = req.body;

  try {
    const reqResult = await query(`SELECT * FROM payment_requests WHERE id = $1`, [id]);
    const payReq = reqResult.rows[0];
    if (!payReq) return res.status(404).json({ error: 'Request not found' });
    if (payReq.status !== 'pending') return res.status(409).json({ error: 'Request already reviewed' });

    await query(
      `UPDATE payment_requests SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [admin_note || null, req.session.user.id, id]
    );

    await query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [payReq.user_id, `Your payment request was not approved. ${admin_note ? 'Note: ' + admin_note : 'Please contact support for assistance.'}`]
    );

    return res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('rejectPaymentRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/payment/my-requests — client: check own request status
 */
async function getMyRequests(req, res) {
  try {
    const result = await query(
      `SELECT id, requested_tier, transaction_id, payment_platform, amount, status, admin_note, created_at
       FROM payment_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getMyRequests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { submitPaymentRequest, listPaymentRequests, approvePaymentRequest, rejectPaymentRequest, getMyRequests };
