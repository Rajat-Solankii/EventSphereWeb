const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');

function getSmtpTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
  }
  return null;
}

async function sendRemovedFromOrgEmail(userEmail, userName, orgName) {
  const transporter = getSmtpTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: userEmail,
    subject: `Your Account has been Removed from ${orgName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
        <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;">
          <h1 style="margin:0;color:#000000;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Account Deleted</h1>
          <p style="margin:8px 0 0;color:#666666;font-size:15px;">Your account has been removed by your organization administrator.</p>
        </div>
        <div style="padding:40px;">
          <p style="color:#111111;font-size:15px;margin:0 0 24px;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">This email is to notify you that your EventSphere account associated with <strong>${orgName}</strong> has been deleted by an administrator.</p>
          <p style="color:#666666;font-size:13px;margin:24px 0 0;">If you believe this was a mistake, please contact your organization administrator.</p>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
          <p style="margin:0;color:#999999;font-size:12px;text-align:center;">Powered by EventSphere &middot; Automated message</p>
        </div>
      </div>
    `
  });
}

const prisma = new PrismaClient();

// ===== LIST ALL USERS IN ORG =====
router.get('/users', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { organization_id: req.user.organization_id },
      select: {
        id: true, name: true, email: true, role: true,
        is_active: true, is_verified: true, created_at: true,
        event_access: {
          select: {
            event: { select: { id: true, title: true } }
          }
        },
        _count: { select: { sessions: true } }
      },
      orderBy: { created_at: 'asc' }
    });
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// ===== OTP VERIFICATION =====
router.post('/users/send-otp', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(409).json({ success: false, message: 'Email already in use.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60000); // 10 mins

    await prisma.otpVerification.upsert({
      where: { email: email.toLowerCase() },
      update: { otp, expires_at, is_verified: false },
      create: { email: email.toLowerCase(), otp, expires_at }
    });

    const transporter = getSmtpTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'EventSphere - Staff Verification Code',
        html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
          <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;text-align:center;">
            <h2 style="color:#000000;margin:0;font-size:24px;font-weight:600;letter-spacing:-0.5px;">EventSphere</h2>
          </div>
          <div style="padding:40px;text-align:center;">
            <h3 style="color:#111111;margin-top:0;font-size:20px;font-weight:600;">Verify Your Email</h3>
            <p style="color:#666666;font-size:15px;line-height:1.6;margin-bottom:32px;">
              You're almost there! We need to verify this email address to set up your staff account on EventSphere. Use the one-time password (OTP) below:
            </p>
            <div style="background:#fafafa;border-radius:8px;padding:24px;margin-bottom:32px;border:1px solid #e5e5e5;">
              <h1 style="color:#000000;margin:0;font-size:42px;letter-spacing:12px;font-weight:700;padding-left:12px;font-family:monospace;">${otp}</h1>
            </div>
            <p style="color:#666666;font-size:13px;margin:0;">
              This code will expire in <strong>10 minutes</strong>.<br>If you didn't request this, please safely ignore this email.
            </p>
          </div>
          <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
            <p style="margin:0;color:#999999;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
        `
      });
    } else {
      console.log(`[DEBUG] OTP for ${email}: ${otp}`);
    }

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

router.post('/users/verify-otp', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase() } });
    if (!record || record.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or incorrect OTP' });
    }
    if (record.expires_at < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    await prisma.otpVerification.update({
      where: { email: email.toLowerCase() },
      data: { is_verified: true }
    });

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// ===== CREATE STAFF USER (by ORG_ADMIN) =====
router.post('/users', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const otpRecord = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase() } });
    if (!otpRecord || !otpRecord.is_verified) {
      return res.status(403).json({ success: false, message: 'Email must be verified via OTP before creating account.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role: role || 'EVENT_MANAGER',
        is_verified: true, // Admin-created users are auto-verified
        is_active: true,
        organization_id: req.user.organization_id
      },
      select: { id: true, name: true, email: true, role: true, is_active: true, is_verified: true, created_at: true }
    });

    await prisma.otpVerification.delete({ where: { email: email.toLowerCase() } }).catch(() => {});

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// ===== UPDATE USER =====
router.put('/users/:id', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    const { name, role, is_active, password } = req.body;
    
    // Prevent ORG_ADMIN from deactivating themselves
    if (req.params.id === req.user.id && is_active === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    // Ensure user belongs to this org
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found in your organization.' });

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (role) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, is_active: true, is_verified: true }
    });

    // If deactivating, revoke all their sessions
    if (is_active === false) {
      await prisma.session.deleteMany({ where: { user_id: req.params.id } });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// ===== DELETE USER =====
router.delete('/users/:id', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    // Ensure user belongs to this org
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found in your organization.' });

    // Check if the user to delete is the primary organization administrator
    const mainAdmin = await prisma.user.findFirst({
      where: { organization_id: req.user.organization_id, role: 'ORG_ADMIN' },
      orderBy: { created_at: 'asc' }
    });
    
    if (mainAdmin && existing.id === mainAdmin.id) {
      return res.status(403).json({ success: false, message: "The primary organization administrator cannot be deleted. Please transfer the role to someone else first." });
    }

    await prisma.session.deleteMany({ where: { user_id: req.params.id } });
    await prisma.eventAccess.deleteMany({ where: { user_id: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    
    // Fetch org name for the email
    const org = await prisma.organization.findUnique({ where: { id: req.user.organization_id } });
    sendRemovedFromOrgEmail(existing.email, existing.name, org?.name || 'your organization').catch(() => {});

    res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// ===== GRANT EVENT ACCESS =====
router.post('/users/:id/events/:eventId', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    // Ensure event belongs to this org
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, organization_id: req.user.organization_id }
    });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found in your organization.' });

    // Ensure user belongs to this org
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found in your organization.' });

    const access = await prisma.eventAccess.upsert({
      where: { user_id_event_id: { user_id: req.params.id, event_id: req.params.eventId } },
      create: { user_id: req.params.id, event_id: req.params.eventId },
      update: {}
    });
    res.status(200).json({ success: true, access });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to grant event access.' });
  }
});

// ===== REVOKE EVENT ACCESS =====
router.delete('/users/:id/events/:eventId', verifyToken, requireRole('ORG_ADMIN'), async (req, res) => {
  try {
    await prisma.eventAccess.deleteMany({
      where: { user_id: req.params.id, event_id: req.params.eventId }
    });
    res.status(200).json({ success: true, message: 'Event access revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke event access.' });
  }
});

module.exports = router;
