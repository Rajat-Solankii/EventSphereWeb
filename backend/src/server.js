// ===== LOAD ENV FIRST =====
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const upload = multer({ storage: multer.memoryStorage() });

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');

// Middleware
const { apiLimiter } = require('./middleware/rateLimit');
const { verifyToken, requireEventAccess } = require('./middleware/auth');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ===== SECURITY & CORE MIDDLEWARE =====
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(apiLimiter);

// ===== MOUNT ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/admin', adminRoutes);

// ===== SMTP HELPER FUNCTIONS (shared) =====

function createTransporterFromConfig(smtpConfig) {
  if (smtpConfig?.host && smtpConfig?.user && smtpConfig?.pass) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port) || 587,
      secure: parseInt(smtpConfig.port) === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      tls: { rejectUnauthorized: false }
    });
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587,
    auth: { user: 'mylene.mayer@ethereal.email', pass: '6n9P5V6xKQmP4N7F8U' }
  });
}

function buildConfirmationEmail(attendee) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fcfd;border-radius:16px;overflow:hidden;border:1px solid rgba(79,178,192,0.2);">
      <div style="background:linear-gradient(90deg,#4fb2c0,#97a1da);padding:32px 40px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">You're In! 🎉</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">${attendee.eventTitle}</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#081317;font-size:16px;margin:0 0 24px;">Hi <strong style="color:#4fb2c0;">${attendee.name}</strong>,</p>
        <p style="color:#081317;font-size:15px;margin:0 0 24px;">Your <strong style="color:#4fb2c0;">${attendee.tierName}</strong> pass is confirmed.</p>
        <div style="background:rgba(79,178,192,0.05);border:1px solid rgba(79,178,192,0.15);border-radius:12px;padding:24px;margin:24px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#081317;opacity:0.7;font-size:14px;width:40%;">Event</td><td style="padding:8px 0;color:#081317;font-size:14px;font-weight:600;">${attendee.eventTitle}</td></tr>
            <tr><td style="padding:8px 0;color:#081317;opacity:0.7;font-size:14px;">Date</td><td style="padding:8px 0;color:#081317;font-size:14px;font-weight:600;">${attendee.eventDate || 'See event details'}</td></tr>
            <tr><td style="padding:8px 0;color:#081317;opacity:0.7;font-size:14px;">Venue</td><td style="padding:8px 0;color:#081317;font-size:14px;font-weight:600;">${attendee.eventVenue || 'See event details'}</td></tr>
            <tr><td style="padding:8px 0;color:#081317;opacity:0.7;font-size:14px;">Tier</td><td style="padding:8px 0;color:#081317;font-size:14px;font-weight:600;">${attendee.tierName}</td></tr>
            <tr style="border-top:1px solid rgba(79,178,192,0.15);">
              <td style="padding:12px 0 0;color:#081317;opacity:0.7;font-size:14px;">Pass ID</td>
              <td style="padding:12px 0 0;"><span style="font-family:'Courier New',monospace;background:rgba(79,178,192,0.1);color:#4fb2c0;padding:4px 10px;border-radius:6px;font-size:14px;border:1px solid rgba(79,178,192,0.2);">${attendee.passId}</span></td>
            </tr>
          </table>
        </div>
      </div>
      <div style="padding:20px 40px;border-top:1px solid rgba(79,178,192,0.1);">
        <p style="margin:0;color:#081317;font-size:12px;text-align:center;opacity:0.5;">Powered by EventSphere</p>
      </div>
    </div>
  `;
}

function buildDeclinedEmail(attendee) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fcfd;border-radius:16px;overflow:hidden;border:1px solid rgba(225,29,72,0.2);">
      <div style="background:linear-gradient(90deg,#e11d48,#f43f5e);padding:32px 40px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">Request Declined</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">${attendee.eventTitle}</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#081317;font-size:16px;margin:0 0 24px;">Hi <strong style="color:#e11d48;">${attendee.name}</strong>,</p>
        <p style="color:#081317;font-size:15px;margin:0 0 24px;">Unfortunately, your request for a <strong style="color:#e11d48;">${attendee.tierName}</strong> pass has been declined by the organizers.</p>
        <div style="background:rgba(225,29,72,0.05);border:1px solid rgba(225,29,72,0.15);border-radius:12px;padding:24px;margin:24px 0;">
          <p style="margin:0;color:#081317;font-size:14px;line-height:1.6;">
            <strong>Payment Refund:</strong> Any processed payment for this ticket will take some time to revert back to your bank account. Depending on your bank, this usually takes between 3 to 7 business days.
          </p>
        </div>
        <p style="color:#081317;font-size:14px;opacity:0.8;margin-top:24px;">If you have any questions, please contact the event organizer directly.</p>
      </div>
      <div style="padding:20px 40px;border-top:1px solid rgba(225,29,72,0.1);">
        <p style="margin:0;color:#081317;font-size:12px;text-align:center;opacity:0.5;">Powered by EventSphere</p>
      </div>
    </div>
  `;
}
// ===== TICKET ENDPOINTS (kept here – need SMTP context) =====

function buildPendingEmail(attendee) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fcfd;border-radius:16px;overflow:hidden;border:1px solid rgba(245,158,11,0.2);">
      <div style="background:linear-gradient(90deg,#f59e0b,#fbbf24);padding:32px 40px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">Transaction Review Pending</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">${attendee.eventTitle}</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#081317;font-size:16px;margin:0 0 24px;">Hi <strong style="color:#f59e0b;">${attendee.name}</strong>,</p>
        <p style="color:#081317;font-size:15px;margin:0 0 24px;">Your payment for a <strong style="color:#f59e0b;">${attendee.tierName}</strong> pass is currently under review by the organizers.</p>
        <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:24px;margin:24px 0;">
          <p style="margin:0;color:#081317;font-size:14px;line-height:1.6;">
            <strong>What happens next?</strong> The event organizers will manually review your uploaded payment screenshot. You will receive another email once your pass is approved.
          </p>
        </div>
      </div>
      <div style="padding:20px 40px;border-top:1px solid rgba(245,158,11,0.1);">
        <p style="margin:0;color:#081317;font-size:12px;text-align:center;opacity:0.5;">Powered by EventSphere</p>
      </div>
    </div>
  `;
}

function buildDeclineEmail(attendee) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fef2f2;border-radius:16px;overflow:hidden;border:1px solid rgba(239,68,68,0.2);">
      <div style="background:linear-gradient(90deg,#ef4444,#f87171);padding:32px 40px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">Action Required: Payment Issue</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">${attendee.eventTitle}</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#081317;font-size:16px;margin:0 0 24px;">Hi <strong style="color:#ef4444;">${attendee.name}</strong>,</p>
        <p style="color:#081317;font-size:15px;margin:0 0 24px;">There was an issue verifying the payment screenshot for your <strong style="color:#ef4444;">${attendee.tierName}</strong> pass. It may have been unclear or incorrect.</p>
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:24px;margin:24px 0;">
          <p style="margin:0;color:#081317;font-size:14px;line-height:1.6;">
            <strong>Your ticket has been put on HOLD.</strong> Please reply directly to this email with a valid, clear payment screenshot before tickets run out. If we don't receive a valid payment screenshot, your registration will not be considered.
          </p>
        </div>
      </div>
      <div style="padding:20px 40px;border-top:1px solid rgba(239,68,68,0.1);">
        <p style="margin:0;color:#081317;font-size:12px;text-align:center;opacity:0.5;">Powered by EventSphere</p>
      </div>
    </div>
  `;
}

// Public: GET all tickets (admin only)
app.get('/api/v1/tickets', verifyToken, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'EVENT_MANAGER') {
      const access = await prisma.eventAccess.findMany({ where: { user_id: req.user.id }, select: { event_id: true } });
      where = { event_id: { in: access.map(a => a.event_id) }, event: { organization_id: req.user.organization_id } };
    } else if (req.user.role === 'ORG_ADMIN') {
      where = { event: { organization_id: req.user.organization_id } };
    } else if (req.user.role !== 'SYSTEM_ADMIN') {
      where = { event_id: -1 }; // No access
    }
    const tickets = await prisma.ticket.findMany({ where, include: { event: true } });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// Public: Book ticket (registration page – no auth required)
app.post('/api/v1/tickets/book', async (req, res) => {
  const { attendee } = req.body;
  if (!attendee?.email) return res.status(400).json({ success: false, message: 'Attendee email required.' });

  try {
    const dbTicket = await prisma.ticket.create({
      data: {
        event_id: attendee.eventId,
        attendee_name: attendee.name,
        student_roll_no: attendee.student_roll_no || attendee.name?.replace(/\s+/g, '_').toUpperCase() || 'ATTENDEE',
        attendee_email: attendee.email,
        attendee_phone: attendee.phone || null,
        tier_id: attendee.tierId ? String(attendee.tierId) : null,
        tier_name: attendee.tierName || null,
        custom_data: attendee.customData ? JSON.stringify(attendee.customData) : null,
        payment_screenshot: attendee.paymentScreenshot || null,
        status: attendee.paymentScreenshot ? 'PENDING' : 'OUTSIDE'
      }
    });

    const realPassId = dbTicket.id;
    let messageId = null, emailError = null;

    try {
      const eventData = await prisma.event.findUnique({
        where: { id: attendee.eventId },
        select: { smtp_config: true, title: true }
      });
      let smtpConfig = eventData?.smtp_config ? JSON.parse(eventData.smtp_config) : null;
      let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${eventData.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);

      const transporter = createTransporterFromConfig(smtpConfig);
      
      let subject = '';
      let htmlContent = '';
      
      if (dbTicket.status !== 'PENDING') {
        subject = `✅ Your Pass for ${attendee.eventTitle} – Confirmed!`;
        htmlContent = buildConfirmationEmail({ ...attendee, passId: realPassId });
      } else {
        subject = `⏳ Transaction Review Pending - ${attendee.eventTitle}`;
        htmlContent = buildPendingEmail({ ...attendee, passId: realPassId });
      }

      const info = await transporter.sendMail({
        from: fromAddress,
        to: attendee.email,
        subject,
        html: htmlContent
      });
      messageId = info.messageId;
      console.log(`✉️  ${dbTicket.status !== 'PENDING' ? 'Confirmation' : 'Pending Review'} → ${attendee.email} | ${info.messageId}`);
    } catch (err) {
      emailError = err.message;
      console.error('⚠️  Email failed (ticket saved):', err.message);
    }

    res.status(200).json({
      success: true, passId: realPassId, messageId, emailError,
      ticket: { id: dbTicket.id, event_id: dbTicket.event_id, attendee_name: dbTicket.attendee_name, attendee_email: dbTicket.attendee_email, tier_name: dbTicket.tier_name, status: dbTicket.status, created_at: dbTicket.created_at }
    });
  } catch (err) {
    console.error('Booking error:', err);
    if (err.code === 'P2003') return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    res.status(500).json({ success: false, message: 'Failed to book ticket. Please try again.' });
  }
});

// Delete ticket
app.delete('/api/v1/tickets/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Check access for EVENT_MANAGER
    if (req.user.role === 'EVENT_MANAGER') {
      const access = await prisma.eventAccess.findUnique({
        where: { user_id_event_id: { user_id: req.user.id, event_id: ticket.event_id } }
      });
      if (!access) return res.status(403).json({ error: 'Access denied.' });
    }

    // Send decline email to attendee
    if (ticket.attendee_email) {
      try {
        let smtpConfig = ticket.event.smtp_config ? JSON.parse(ticket.event.smtp_config) : null;
        let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${ticket.event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
        const transporter = createTransporterFromConfig(smtpConfig);

        await transporter.sendMail({
          from: fromAddress,
          to: ticket.attendee_email,
          subject: `Request Declined – ${ticket.event.title}`,
          html: buildDeclinedEmail({
            name: ticket.attendee_name,
            eventTitle: ticket.event.title,
            tierName: ticket.tier_name || 'General Admission'
          })
        });
        console.log(`✉️  Declined email → ${ticket.attendee_email}`);
      } catch (err) {
        console.error('⚠️  Failed to send declined email:', err.message);
      }
    }

    await prisma.$transaction([
      prisma.attendanceLog.deleteMany({ where: { ticket_id: id } }),
      prisma.ticket.delete({ where: { id } })
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete ticket error:', err);
    res.status(500).json({ error: 'Failed to delete ticket.' });
  }
});

// Verify Payment endpoint
app.post('/api/v1/tickets/:id/verify-payment', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Check access for EVENT_MANAGER
    if (req.user.role === 'EVENT_MANAGER') {
      const access = await prisma.eventAccess.findUnique({
        where: { user_id_event_id: { user_id: req.user.id, event_id: ticket.event_id } }
      });
      if (!access) return res.status(403).json({ error: 'Access denied.' });
    }

    if (ticket.status !== 'PENDING' && ticket.status !== 'DECLINED') {
      return res.status(400).json({ error: 'Ticket is not pending or declined verification.' });
    }

    // Update status to OUTSIDE (valid)
    await prisma.ticket.update({
      where: { id },
      data: { status: 'OUTSIDE' }
    });

    // Send confirmation email
    let messageId = null, emailError = null;
    if (ticket.attendee_email) {
      try {
        let smtpConfig = ticket.event.smtp_config ? JSON.parse(ticket.event.smtp_config) : null;
        let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${ticket.event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
        const transporter = createTransporterFromConfig(smtpConfig);

        const info = await transporter.sendMail({
          from: fromAddress,
          to: ticket.attendee_email,
          subject: `✅ Your Pass for ${ticket.event.title} – Payment Verified!`,
          html: buildConfirmationEmail({
            name: ticket.attendee_name,
            tierName: ticket.tier_name || 'General Admission',
            eventTitle: ticket.event.title,
            eventDate: ticket.event.date_time ? new Date(ticket.event.date_time).toLocaleDateString() : '',
            eventVenue: ticket.event.venue || 'See event details',
            passId: ticket.id
          })
        });
        messageId = info.messageId;
        console.log(`✉️  Confirmation (Verified) → ${ticket.attendee_email} | ${info.messageId}`);
      } catch (err) {
        emailError = err.message;
        console.error('⚠️  Failed to send confirmation email on verify:', err.message);
      }
    }

    res.status(200).json({ success: true, message: 'Payment verified and ticket confirmed.', messageId, emailError });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// Decline Payment endpoint
app.post('/api/v1/tickets/:id/decline-payment', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Check access for EVENT_MANAGER
    if (req.user.role === 'EVENT_MANAGER') {
      const access = await prisma.eventAccess.findUnique({
        where: { user_id_event_id: { user_id: req.user.id, event_id: ticket.event_id } }
      });
      if (!access) return res.status(403).json({ error: 'Access denied.' });
    }

    if (ticket.status !== 'PENDING') {
      return res.status(400).json({ error: 'Ticket is not pending verification.' });
    }

    // Update status to DECLINED (Hold)
    await prisma.ticket.update({
      where: { id },
      data: { status: 'DECLINED' }
    });

    // Send decline email
    let messageId = null, emailError = null;
    if (ticket.attendee_email) {
      try {
        let smtpConfig = ticket.event.smtp_config ? JSON.parse(ticket.event.smtp_config) : null;
        let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${ticket.event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
        const transporter = createTransporterFromConfig(smtpConfig);

        const info = await transporter.sendMail({
          from: fromAddress,
          to: ticket.attendee_email,
          subject: `⚠️ Action Required: Payment Issue for ${ticket.event.title}`,
          html: buildDeclineEmail({
            name: ticket.attendee_name,
            tierName: ticket.tier_name || 'General Admission',
            eventTitle: ticket.event.title
          }),
          replyTo: smtpConfig?.user || undefined
        });
        messageId = info.messageId;
        console.log(`✉️  Decline (Hold) → ${ticket.attendee_email} | ${info.messageId}`);
      } catch (err) {
        emailError = err.message;
        console.error('⚠️  Failed to send decline email:', err.message);
      }
    }

    res.status(200).json({ success: true, message: 'Payment declined and ticket put on hold.', messageId, emailError });
  } catch (err) {
    console.error('Decline payment error:', err);
    res.status(500).json({ error: 'Failed to decline payment.' });
  }
});

// ===== SMTP TEST ENDPOINT =====
app.post('/api/v1/smtp/test', verifyToken, async (req, res) => {
  const { host, port, user, pass, fromEmail, toEmail } = req.body;
  if (!host || !user || !pass) return res.status(400).json({ success: false, message: 'SMTP host, username, and password are required.' });
  if (!toEmail) return res.status(400).json({ success: false, message: 'Recipient email (toEmail) is required.' });

  const transporter = createTransporterFromConfig({ host, port: port || 587, user, pass });
  const from = fromEmail || `"EventSphere Test" <${user}>`;
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from, to: toEmail,
      subject: '✅ EventSphere SMTP Test – Connection Successful',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f9fafb; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb; text-align: center;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
            <h2 style="color: #4fb2c0; margin: 0 0 20px; font-size: 24px;">Thanks for using EventSphere!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px;">Your SMTP is now set up and configured correctly.</p>
            <div style="background-color: #f8fcfd; border: 1px solid rgba(79,178,192,0.2); border-radius: 8px; padding: 16px; margin: 0 auto; max-width: 300px; text-align: left;">
              <p style="color: #081317; margin: 0 0 8px; font-size: 14px;"><strong>Host:</strong> ${host}:${port || 587}</p>
              <p style="color: #081317; opacity: 0.8; margin: 0; font-size: 12px;"><strong>Tested at:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `
    });
    console.log(`✉️  Test email → ${toEmail} | ${info.messageId}`);
    res.status(200).json({ success: true, message: `Test email delivered to ${toEmail}`, messageId: info.messageId });
  } catch (err) {
    let msg = err.code === 'EAUTH' ? 'Authentication failed. Use an App Password for Gmail.'
      : err.code === 'ECONNREFUSED' ? `Connection refused to ${host}:${port || 587}.`
        : err.code === 'ETIMEDOUT' ? `Connection timed out to ${host}.`
          : err.responseCode === 535 ? 'Credentials rejected. Use an App Password for Gmail.'
            : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

// ===== EMAIL ALL ATTENDEES BROADCAST =====
app.post('/api/v1/events/:id/email-all', verifyToken, requireEventAccess, upload.array('attachments'), async (req, res) => {
  const { subject, message, senderName } = req.body;
  if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });

  try {
    const mailAttachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    })) : [];

    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tickets: { where: { attendee_email: { not: null } } } }
    });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const tickets = event.tickets.filter(t => t.attendee_email?.trim());
    if (tickets.length === 0) return res.status(200).json({ success: true, sent: 0, message: 'No attendees with emails.' });

    let smtpConfig = event.smtp_config ? JSON.parse(event.smtp_config) : null;
    let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${senderName || event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
    const transporter = createTransporterFromConfig(smtpConfig);

    let sent = 0, failed = 0, errors = [];
    for (const ticket of tickets) {
      try {
        let customizedMessage = message.replace(/\{\{name\}\}/g, ticket.attendee_name || 'Attendee');
        await transporter.sendMail({
          from: fromAddress, 
          to: ticket.attendee_email, 
          subject,
          html: customizedMessage,
          attachments: mailAttachments
        });
        sent++;
        if (sent % 5 === 0) await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        failed++;
        errors.push({ email: ticket.attendee_email, error: err.message });
      }
    }
    res.status(200).json({ success: true, sent, failed, total: tickets.length, errors: errors.length ? errors : undefined, message: `Broadcast: ${sent} delivered, ${failed} failed.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Broadcast failed.' });
  }
});

// ===== CUSTOM EMAIL TO SINGLE ATTENDEE =====
app.post('/api/v1/tickets/:id/custom-email', verifyToken, upload.array('attachments'), async (req, res) => {
  const { subject, message, senderName } = req.body;
  if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { event: true } });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (!ticket.attendee_email) return res.status(400).json({ success: false, message: 'No email on record.' });

    let smtpConfig = ticket.event?.smtp_config ? JSON.parse(ticket.event.smtp_config) : null;
    let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${senderName || ticket.event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
    const transporter = createTransporterFromConfig(smtpConfig);

    const mailAttachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    })) : [];

    let customizedMessage = message.replace(/\{\{name\}\}/g, ticket.attendee_name || 'Attendee');

    await transporter.sendMail({
      from: fromAddress, 
      to: ticket.attendee_email, 
      subject,
      html: customizedMessage,
      attachments: mailAttachments
    });

    res.status(200).json({ success: true, message: `Message sent to ${ticket.attendee_email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== RESEND CONFIRMATION TO SINGLE ATTENDEE =====
app.post('/api/v1/tickets/:id/resend-email', verifyToken, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { event: true } });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (!ticket.attendee_email) return res.status(400).json({ success: false, message: 'No email on record.' });

    let smtpConfig = ticket.event?.smtp_config ? JSON.parse(ticket.event.smtp_config) : null;
    let fromAddress = smtpConfig?.fromEmail || (smtpConfig?.user ? `"${ticket.event.title}" <${smtpConfig.user}>` : process.env.SMTP_FROM || `"EventSphere" <noreply@eventsphere.com>`);
    const transporter = createTransporterFromConfig(smtpConfig);

    await transporter.sendMail({
      from: fromAddress, to: ticket.attendee_email,
      subject: `🎫 Your Pass for ${ticket.event?.title} – Resent`,
      html: buildConfirmationEmail({
        name: ticket.attendee_name, email: ticket.attendee_email, passId: ticket.id,
        tierName: ticket.tier_name, eventTitle: ticket.event?.title,
        eventDate: ticket.event?.date_time ? new Date(ticket.event.date_time).toLocaleDateString() : '',
        eventVenue: ticket.event?.venue
      })
    });
    res.status(200).json({ success: true, message: `Confirmation resent to ${ticket.attendee_email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ANDROID SCANNER ENDPOINTS (unchanged) =====

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.status(200).json({ id: ticket.id, attendee_name: ticket.attendee_name, student_roll_no: ticket.student_roll_no, tier_name: ticket.tier_name, status: ticket.status });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/tickets/:id/scan', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ success: false, message: 'Invalid Ticket' });
    if (ticket.status === 'INSIDE') return res.status(200).json({ success: false, message: 'Already Admitted' });
    await prisma.$transaction([
      prisma.ticket.update({ where: { id: req.params.id }, data: { status: 'INSIDE' } }),
      prisma.attendanceLog.create({ data: { ticket_id: req.params.id, action_type: 'ENTRY', roll_number: ticket.student_roll_no } })
    ]);
    res.status(200).json({ success: true, message: 'Admitted Successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/v1/tickets/scan', async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new Error('Ticket not found');
      switch (ticket.status) {
        case 'OUTSIDE':
          await tx.ticket.update({ where: { id: ticketId }, data: { status: 'INSIDE' } });
          await tx.attendanceLog.create({ data: { ticket_id: ticketId, action_type: 'ENTRY', roll_number: ticket.student_roll_no } });
          return { success: true, status: 'INSIDE', message: 'Access Granted. Welcome!', attendee: { name: ticket.attendee_name, roll_number: ticket.student_roll_no } };
        case 'INSIDE':
          await tx.attendanceLog.create({ data: { ticket_id: ticketId, action_type: 'DENIED', roll_number: ticket.student_roll_no } });
          return { success: false, status: 'INSIDE', message: 'Ticket already scanned inside.', attendee: { name: ticket.attendee_name, roll_number: ticket.student_roll_no } };
        default: throw new Error('Unknown status');
      }
    });
    res.status(200).json(result);
  } catch (err) {
    if (err.message === 'Ticket not found') return res.status(404).json({ success: false, message: 'Invalid Ticket' });
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ===== AUTO DATABASE SETUP & START SERVER =====
async function startServer() {
  // Auto-create database if it doesn't exist
  try {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    const dbPath = dbUrl.replace('file:', '').replace('./', path.join(__dirname, '..', ''));
    const prismaDir = path.join(__dirname, '..', 'prisma');

    if (!fs.existsSync(dbPath.trim())) {
      console.log('⚙️  Database not found. Creating automatically...');
      execSync('npx prisma db push --skip-generate', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('✅ Database created and schema synced.');
    } else {
      // Database exists — ensure schema is up to date
      try {
        execSync('npx prisma db push --skip-generate', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
      } catch (e) {
        // Schema already in sync, ignore
      }
    }
  } catch (err) {
    console.error('⚠️  Auto database setup failed:', err.message);
    console.log('   Run manually: cd backend && npx prisma db push');
  }

  app.listen(PORT, async () => {
    console.log(`\n🚀 EventSphere API Server`);
    console.log(`   Listening at: http://localhost:${PORT}`);
    console.log(`   SMTP: ${process.env.SMTP_HOST ? `✅ ${process.env.SMTP_HOST}` : '⚠️  Ethereal fallback'}`);
    console.log(`   DB:   ${process.env.DATABASE_URL ? '✅' : '❌ DATABASE_URL missing'}\n`);
  });
}

startServer();

