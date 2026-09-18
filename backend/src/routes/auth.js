const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { authLimiter, emailLimiter } = require('../middleware/rateLimit');
const { verifyToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// ===== HELPERS =====
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== HELPERS =====

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, organization_id: user.organization_id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

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

async function sendVerificationEmail(user, otp) {
  const transporter = getSmtpTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: user.email,
    subject: '✉️ Verify Your EventSphere Account',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
        <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;">
          <h1 style="margin:0;color:#000000;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Verify Your Email</h1>
          <p style="margin:8px 0 0;color:#666666;font-size:15px;">One more step to activate your EventSphere account.</p>
        </div>
        <div style="padding:40px;">
          <p style="color:#111111;font-size:15px;margin:0 0 24px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">You've been invited to join EventSphere. Use the one-time code below to verify your email address and activate your account.</p>
          
          <div style="background:#fafafa;border-radius:8px;padding:24px;margin-bottom:32px;border:1px solid #e5e5e5;text-align:center;">
            <h1 style="color:#000000;margin:0;font-size:42px;letter-spacing:12px;font-weight:700;padding-left:12px;font-family:monospace;">${otp}</h1>
          </div>

          <p style="color:#666666;font-size:13px;margin:24px 0 0;">This code expires in <strong>24 hours</strong>. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
          <p style="margin:0;color:#999999;font-size:12px;text-align:center;">Powered by EventSphere &middot; Automated message</p>
        </div>
      </div>
    `
  });
}

async function sendPasswordResetEmail(user, otp) {
  const transporter = getSmtpTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: user.email,
    subject: '🔒 Reset Your EventSphere Password',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
        <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;">
          <h1 style="margin:0;color:#000000;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Password Reset</h1>
          <p style="margin:8px 0 0;color:#666666;font-size:15px;">We received a request to reset your password.</p>
        </div>
        <div style="padding:40px;">
          <p style="color:#111111;font-size:15px;margin:0 0 24px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">Use the one-time code below to choose a new password. If you didn't request this, you can safely ignore this email.</p>
          
          <div style="background:#fafafa;border-radius:8px;padding:24px;margin-bottom:32px;border:1px solid #e5e5e5;text-align:center;">
            <h1 style="color:#000000;margin:0;font-size:42px;letter-spacing:12px;font-weight:700;padding-left:12px;font-family:monospace;">${otp}</h1>
          </div>

          <p style="color:#666666;font-size:13px;margin:24px 0 0;">This code expires in <strong>1 hour</strong>.</p>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
          <p style="margin:0;color:#999999;font-size:12px;text-align:center;">Powered by EventSphere &middot; Automated message</p>
        </div>
      </div>
    `
  });
}

async function sendAccountDeletionEmail(userEmail, userName) {
  const transporter = getSmtpTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: userEmail,
    subject: '👋 Your EventSphere Account Has Been Deleted',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
        <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;">
          <h1 style="margin:0;color:#000000;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Account Deleted</h1>
          <p style="margin:8px 0 0;color:#666666;font-size:15px;">We're genuinely sad to see you go! 😢</p>
        </div>
        <div style="padding:40px;">
          <p style="color:#111111;font-size:15px;margin:0 0 24px;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">This email is to confirm that your EventSphere account has been successfully deleted.</p>
          <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">It breaks our heart a little bit to say goodbye. Thank you for being a part of our journey, even if it was just for a little while.</p>
          <p style="color:#666666;font-size:13px;margin:24px 0 0;">If you ever change your mind and wish to return, our doors will always be open for you.</p>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
          <p style="margin:0;color:#999999;font-size:12px;text-align:center;">Powered by EventSphere &middot; Automated message</p>
        </div>
      </div>
    `
  });
}

// ===== REGISTER =====
// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = generateOTP();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const metaData = JSON.stringify({
      name: name.trim(),
      password: hashedPassword
    });

    await prisma.otpVerification.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        otp: verificationToken,
        expires_at: verificationExpiry,
        is_verified: false,
        meta_data: metaData
      },
      create: {
        email: email.toLowerCase().trim(),
        otp: verificationToken,
        expires_at: verificationExpiry,
        is_verified: false,
        meta_data: metaData
      }
    });

    // Send verification email (non-blocking)
    const userForEmail = { name: name.trim(), email: email.toLowerCase().trim() };
    sendVerificationEmail(userForEmail, verificationToken).catch(err =>
      console.error('Verification email failed:', err.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Organization created! Please check your email to verify your account before logging in.',
      requiresVerification: true
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ===== LOGIN =====
// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact an admin.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Create session
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        user_agent: req.headers['user-agent']?.substring(0, 255) || null,
        ip_address: req.ip || null
      }
    });

    const accessToken = generateAccessToken(user);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        profile_image: user.profile_image
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ===== REFRESH TOKEN =====
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token found.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const session = await prisma.session.findUnique({
      where: { refresh_token: token },
      include: { user: true }
    });

    if (!session || session.expires_at < new Date()) {
      res.clearCookie('refresh_token');
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (!session.user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken(session.user);
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.update({
      where: { id: session.id },
      data: { refresh_token: newRefreshToken, expires_at: newExpiry }
    });

    const accessToken = generateAccessToken(session.user);
    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        organization_id: session.user.organization_id,
        profile_image: session.user.profile_image
      }
    });
  } catch (err) {
    res.clearCookie('refresh_token');
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
});

// ===== LOGOUT =====
// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await prisma.session.deleteMany({ where: { refresh_token: token } }).catch(() => {});
    }
    res.clearCookie('refresh_token');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.clearCookie('refresh_token');
    return res.status(200).json({ success: true, message: 'Logged out.' });
  }
});

// ===== PROFILE OTP: Send OTP to an email for profile changes =====
// POST /api/auth/profile/send-otp
router.post('/profile/send-otp', verifyToken, emailLimiter, async (req, res) => {
  try {
    const { email, purpose } = req.body;
    // purpose: 'email_change' → send OTP to the NEW email
    // purpose: 'password_reset' → send OTP to the user's CURRENT email

    let targetEmail;
    if (purpose === 'password_reset') {
      // Staff cannot change their own password
      if (req.user.role !== 'ORG_ADMIN' && req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({ success: false, message: 'Staff members cannot change their own password.' });
      }
      targetEmail = req.user.email;
    } else if (purpose === 'email_change') {
      if (!email) return res.status(400).json({ success: false, message: 'New email is required.' });
      targetEmail = email.toLowerCase().trim();
      // Check if new email is already in use
      const existing = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (existing) return res.status(409).json({ success: false, message: 'This email is already in use.' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid purpose. Use "email_change" or "password_reset".' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60000); // 10 mins

    await prisma.otpVerification.upsert({
      where: { email: targetEmail },
      update: { otp, expires_at, is_verified: false },
      create: { email: targetEmail, otp, expires_at }
    });

    // Send OTP email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      });

      const subjectLine = purpose === 'email_change'
        ? 'EventSphere – Verify Your New Email'
        : 'EventSphere – Password Reset Code';

      const purposeText = purpose === 'email_change'
        ? 'verify your new email address'
        : 'reset your password';

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: subjectLine,
        html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
          <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;text-align:center;">
            <h2 style="color:#000000;margin:0;font-size:24px;font-weight:600;letter-spacing:-0.5px;">EventSphere</h2>
          </div>
          <div style="padding:40px;text-align:center;">
            <h3 style="color:#111111;margin-top:0;font-size:20px;font-weight:600;">Verification Code</h3>
            <p style="color:#666666;font-size:15px;line-height:1.5;margin-bottom:32px;">
              Use this one-time code to ${purposeText}:
            </p>
            <div style="background:#fafafa;border-radius:8px;padding:24px;margin-bottom:32px;border:1px solid #e5e5e5;">
              <h1 style="color:#000000;margin:0;font-size:42px;letter-spacing:12px;font-weight:700;padding-left:12px;font-family:monospace;">${otp}</h1>
            </div>
            <p style="color:#666666;font-size:13px;margin:0;">
              This code will expire in <strong>10 minutes</strong>.<br>If you didn't request this, please ignore this email.
            </p>
          </div>
          <div style="padding:20px 40px;border-top:1px solid #e5e5e5;background:#fafafa;">
            <p style="margin:0;color:#999999;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
          </div>
        </div>
        `
      });
    } else {
      console.log(`[DEBUG] Profile OTP for ${targetEmail}: ${otp}`);
    }

    res.status(200).json({ success: true, message: `Verification code sent to ${targetEmail}.` });
  } catch (err) {
    console.error('Profile send-otp error:', err);
    res.status(500).json({ success: false, message: 'Failed to send verification code.' });
  }
});

// ===== PROFILE OTP: Verify OTP =====
// POST /api/auth/profile/verify-otp
router.post('/profile/verify-otp', verifyToken, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

    const record = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!record || record.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or incorrect code.' });
    }
    if (record.expires_at < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }

    await prisma.otpVerification.update({
      where: { email: email.toLowerCase().trim() },
      data: { is_verified: true }
    });

    res.status(200).json({ success: true, message: 'Code verified successfully.' });
  } catch (err) {
    console.error('Profile verify-otp error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify code.' });
  }
});

// ===== UPDATE PROFILE (SECURE) =====
// PUT /api/auth/profile
router.put('/profile', verifyToken, authLimiter, async (req, res) => {
  try {
    const { name, profile_image, newEmail, currentPassword, newPassword, otpEmail, action } = req.body;
    const userId = req.user.id;
    const fullUser = await prisma.user.findUnique({ where: { id: userId } });

    // ===== ACTION: Update basic info (name, profile_image) =====
    if (action === 'update_basic') {
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (profile_image !== undefined) updateData.profile_image = profile_image;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, organization_id: true, profile_image: true }
      });
      return res.status(200).json({ success: true, message: 'Profile updated.', user: updatedUser });
    }

    // ===== ACTION: Change email (requires currentPassword + verified OTP on new email) =====
    if (action === 'change_email') {
      if (!currentPassword || !newEmail) {
        return res.status(400).json({ success: false, message: 'Current password and new email are required.' });
      }

      const validPassword = await bcrypt.compare(currentPassword, fullUser.password);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }

      const targetEmail = newEmail.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (existing) return res.status(409).json({ success: false, message: 'Email already in use.' });

      // Check OTP was verified for this email
      const otpRecord = await prisma.otpVerification.findUnique({ where: { email: targetEmail } });
      if (!otpRecord || !otpRecord.is_verified) {
        return res.status(403).json({ success: false, message: 'New email must be verified via OTP first.' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { email: targetEmail },
        select: { id: true, name: true, email: true, role: true, organization_id: true, profile_image: true }
      });

      // Cleanup OTP record
      await prisma.otpVerification.delete({ where: { email: targetEmail } }).catch(() => {});

      return res.status(200).json({ success: true, message: 'Email updated successfully.', user: updatedUser });
    }

    // ===== ACTION: Change password =====
    if (action === 'change_password') {
      // Staff cannot change their own password
      if (fullUser.role !== 'ORG_ADMIN' && fullUser.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({ success: false, message: 'Staff members cannot change their own password. Contact your organization admin.' });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      }

      // Method 1: via current password
      if (currentPassword) {
        const validPassword = await bcrypt.compare(currentPassword, fullUser.password);
        if (!validPassword) {
          return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }
      }
      // Method 2: via email OTP
      else if (otpEmail) {
        const otpRecord = await prisma.otpVerification.findUnique({ where: { email: fullUser.email } });
        if (!otpRecord || !otpRecord.is_verified) {
          return res.status(403).json({ success: false, message: 'Email OTP must be verified first.' });
        }
        // Cleanup OTP
        await prisma.otpVerification.delete({ where: { email: fullUser.email } }).catch(() => {});
      } else {
        return res.status(400).json({ success: false, message: 'Current password or email OTP verification is required.' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
        select: { id: true, name: true, email: true, role: true, organization_id: true, profile_image: true }
      });

      return res.status(200).json({ success: true, message: 'Password updated successfully.', user: updatedUser });
    }

    return res.status(400).json({ success: false, message: 'Invalid action. Use "update_basic", "change_email", or "change_password".' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ===== GET CURRENT USER =====
// GET /api/auth/me
router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

// ===== GET ALL SESSIONS =====
// GET /api/auth/sessions
router.get('/sessions', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { user_id: req.user.id, expires_at: { gte: new Date() } },
      select: { id: true, created_at: true, user_agent: true, ip_address: true, expires_at: true },
      orderBy: { created_at: 'desc' }
    });
    return res.status(200).json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// ===== REVOKE A SPECIFIC SESSION =====
// DELETE /api/auth/sessions/:id
router.delete('/sessions/:id', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    await prisma.session.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: 'Session revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke session.' });
  }
});

// ===== REVOKE ALL SESSIONS (Logout All Devices) =====
// DELETE /api/auth/sessions
router.delete('/sessions', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    await prisma.session.deleteMany({ where: { user_id: req.user.id } });
    res.clearCookie('refresh_token');
    return res.status(200).json({ success: true, message: 'All sessions revoked. Logged out from all devices.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke all sessions.' });
  }
});

// ===== DELETE OWN ACCOUNT =====
// DELETE /api/auth/me
router.delete('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to delete your account.' });
    }

    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
    
    if (user.role === 'ORG_ADMIN' && user.organization_id) {
      const otherAdmins = await prisma.user.count({
        where: { organization_id: user.organization_id, role: 'ORG_ADMIN', id: { not: userId } }
      });
      if (otherAdmins === 0) {
        await prisma.organization.delete({ where: { id: user.organization_id } });
        res.clearCookie('refresh_token');
        sendAccountDeletionEmail(user.email, user.name).catch(() => {});
        return res.status(200).json({ success: true, message: 'Account and organization deleted successfully.' });
      }
    }

    await prisma.session.deleteMany({ where: { user_id: userId } });
    await prisma.eventAccess.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    
    res.clearCookie('refresh_token');
    sendAccountDeletionEmail(user.email, user.name).catch(() => {});
    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete own account error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
});

// ===== VERIFY EMAIL =====
// POST /api/auth/verify-email
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const otpRecord = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!otpRecord) {
      return res.status(404).json({ success: false, message: 'Verification record not found. Please register again.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or incorrect code.' });
    }

    if (otpRecord.expires_at < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }

    // Now create the actual User if it was a registration
    if (otpRecord.meta_data) {
      try {
        const parsedMeta = JSON.parse(otpRecord.meta_data);
        if (parsedMeta.name && parsedMeta.password) {
          await prisma.user.create({
            data: {
              name: parsedMeta.name,
              email: otpRecord.email,
              password: parsedMeta.password,
              role: 'ORG_ADMIN',
              is_verified: true,
              organization: {
                create: {
                  name: `${parsedMeta.name}'s Organization`
                }
              }
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse meta_data during verification:', e);
      }
    } else {
      // This might be a normal verify email where the user already exists (legacy fallback)
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (user && !user.is_verified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { is_verified: true, verification_token: null, verification_expires_at: null }
        });
      }
    }

    await prisma.otpVerification.delete({ where: { email: email.toLowerCase().trim() } });

    console.log(`✅ Email verified and account created for ${email}`);
    return res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify email.' });
  }
});

// ===== RESEND VERIFICATION EMAIL =====
// POST /api/auth/resend-verification
router.post('/resend-verification', emailLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    // Check if the user already exists and is verified
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (user && user.is_verified) {
      return res.status(200).json({ success: true, message: 'If that account exists and is unverified, a new link has been sent.' });
    }

    // Check if there is an OTP verification record
    const otpRecord = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!otpRecord) {
       return res.status(200).json({ success: true, message: 'If that account exists and is unverified, a new link has been sent.' });
    }

    const verificationToken = generateOTP();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.otpVerification.update({
      where: { email: email.toLowerCase().trim() },
      data: { otp: verificationToken, expires_at: verificationExpiry }
    });

    let userName = 'User';
    if (otpRecord.meta_data) {
      try {
        const parsedMeta = JSON.parse(otpRecord.meta_data);
        if (parsedMeta.name) userName = parsedMeta.name;
      } catch (e) {}
    }
    const userForEmail = { name: userName, email: email.toLowerCase().trim() };
    await sendVerificationEmail(userForEmail, verificationToken);

    return res.status(200).json({ success: true, message: 'Verification email resent. Check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
});

// ===== FORGOT PASSWORD =====
// POST /api/auth/forgot-password
router.post('/forgot-password', emailLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    }

    const resetToken = generateOTP();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { password_reset_token: resetToken, password_reset_expires: resetExpiry }
    });

    await sendPasswordResetEmail(user, resetToken).catch(err =>
      console.error('Password reset email failed:', err.message)
    );

    return res.status(200).json({ success: true, message: 'A password reset link has been sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
});

// ===== RESET PASSWORD =====
// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.password_reset_token !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or incorrect code.' });
    }

    if (user.password_reset_expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new reset.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        password_reset_token: null, 
        password_reset_expires: null 
      }
    });

    // Optionally revoke all sessions to force re-login on all devices
    await prisma.session.deleteMany({ where: { user_id: user.id } });

    return res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

module.exports = router;
