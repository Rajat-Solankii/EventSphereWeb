const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const DEFAULT_WEBADMIN_EMAIL = 'eventsphere565@gmail.com';
const DEFAULT_WEBADMIN_PASSWORD = 'Admin@123';

// Middleware to verify Super Admin token
const verifyWebAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Ensure a Super Admin exists in the database
const ensureSuperAdminExists = async () => {
  let superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (!superAdmin) {
    console.log('No SUPER_ADMIN found. Auto-creating default WebAdmin profile...');

    // Check if the email already exists to avoid P2002 Unique Constraint violation
    let existingUser = await prisma.user.findUnique({
      where: { email: DEFAULT_WEBADMIN_EMAIL }
    });

    if (existingUser) {
      console.log('Promoting existing user to SUPER_ADMIN...');
      superAdmin = await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'SUPER_ADMIN' }
      });
    } else {
      console.log('Creating new default SUPER_ADMIN user...');
      const hashedPassword = await bcrypt.hash(DEFAULT_WEBADMIN_PASSWORD, 12);
      superAdmin = await prisma.user.create({
        data: {
          name: 'Web Admin',
          email: DEFAULT_WEBADMIN_EMAIL,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          is_verified: true
        }
      });
    }
  }
  return superAdmin;
};

// POST /api/v1/webadmin/send-login-otp
router.post('/send-login-otp', async (req, res) => {
  try {
    const superAdmin = await ensureSuperAdminExists();
    const email = superAdmin.email;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'Global SMTP is not configured.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.otpVerification.deleteMany({ where: { email } });
    await prisma.otpVerification.create({
      data: { email, otp, expires_at: new Date(Date.now() + 10 * 60 * 1000) }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"EventSphere WebAdmin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'WebAdmin Login OTP',
      html: `
        <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">WebAdmin Login Request</h2>
          <p>You requested to log into the EventSphere Super Admin panel.</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #000;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent to super admin email.' });
  } catch (error) {
    console.error('Failed to send login OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// POST /api/v1/webadmin/login
router.post('/login', async (req, res) => {
  try {
    const { password, otp } = req.body;

    if (!password && !otp) {
      return res.status(400).json({ error: 'Password or OTP required' });
    }

    // Implicitly find the super admin
    const user = await ensureSuperAdminExists();

    if (password) {
      // Password login
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid password' });
      }
    } else if (otp) {
      // OTP login
      const record = await prisma.otpVerification.findUnique({ where: { email: user.email } });
      if (!record || record.otp !== otp || new Date() > record.expires_at) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }
      await prisma.otpVerification.delete({ where: { email: user.email } });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'SUPER_ADMIN' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ success: true, accessToken: token, user: { email: user.email, role: 'SUPER_ADMIN' } });
  } catch (error) {
    console.error('WebAdmin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/webadmin/profile/send-otp
router.post('/profile/send-otp', verifyWebAdmin, async (req, res) => {
  try {
    const superAdmin = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!superAdmin) return res.status(404).json({ error: 'Super Admin not found.' });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'Global SMTP is not configured.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const email = superAdmin.email;

    await prisma.otpVerification.deleteMany({ where: { email } });
    await prisma.otpVerification.create({
      data: { email, otp, expires_at: new Date(Date.now() + 10 * 60 * 1000) }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"EventSphere WebAdmin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'WebAdmin Profile Update OTP',
      html: `
        <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">WebAdmin Profile Update</h2>
          <p>You requested to change your WebAdmin profile credentials.</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #000;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent to your current email.' });
  } catch (error) {
    console.error('Failed to send WebAdmin profile OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// POST /api/v1/webadmin/profile/update
router.post('/profile/update', verifyWebAdmin, async (req, res) => {
  try {
    const { otp, newEmail, newPassword } = req.body;

    const superAdmin = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!superAdmin) return res.status(404).json({ error: 'Super Admin not found.' });

    const email = superAdmin.email;
    const record = await prisma.otpVerification.findUnique({ where: { email } });

    if (!record || record.otp !== otp || new Date() > record.expires_at) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Valid OTP, proceed with update
    await prisma.otpVerification.delete({ where: { email } });

    const updateData = {};
    if (newEmail) updateData.email = newEmail;
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: superAdmin.id },
      data: updateData
    });

    res.json({ success: true, message: 'Profile updated successfully. Please log in again.' });
  } catch (error) {
    console.error('WebAdmin profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/webadmin/users
router.get('/users', verifyWebAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'SUPER_ADMIN' } }, // Hide super admins from list
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        organization: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/webadmin/users/:id
router.delete('/users/:id', verifyWebAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'SUPER_ADMIN') return res.status(403).json({ error: 'Cannot delete Super Admin' });

    if (user.organization_id) {
      await prisma.organization.delete({ where: { id: user.organization_id } });
    } else {
      await prisma.user.delete({ where: { id } });
    }

    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
