const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole, requireEventAccess } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

const prisma = new PrismaClient();

// ===== GET ALL EVENTS =====
router.get('/', verifyToken, async (req, res) => {
  try {
    let events;

    if (req.user.role === 'EVENT_MANAGER' || req.user.role === 'VISITOR') {
      const accessList = await prisma.eventAccess.findMany({
        where: { user_id: req.user.id },
        select: { event_id: true }
      });
      const allowedIds = accessList.map(a => a.event_id);
      events = await prisma.event.findMany({
        where: { id: { in: allowedIds }, organization_id: req.user.organization_id },
        include: { tickets: true }
      });
    } else if (req.user.role === 'ORG_ADMIN') {
      events = await prisma.event.findMany({
        where: { organization_id: req.user.organization_id },
        include: { tickets: true }
      });
    } else if (req.user.role === 'SYSTEM_ADMIN') {
      events = await prisma.event.findMany({ include: { tickets: true } });
    } else {
      events = []; // Viewers or unknown get none for now in this list
    }

    const parsed = events.map(e => {
      let tiers = e.tiers ? JSON.parse(e.tiers) : [];
      tiers = tiers.map(t => {
        const sold = e.tickets.filter(tk => tk.tier_id === t.id && tk.status !== 'DECLINED').length;
        return { ...t, available: Math.max(0, parseInt(t.capacity || 100) - sold) };
      });
      return {
        ...e,
        available_slots: Math.max(0, e.total_capacity - e.tickets.filter(tk => tk.status !== 'DECLINED').length),
        tiers,
        customFormFields: e.customFormFields ? JSON.parse(e.customFormFields) : [],
        smtp_config: e.smtp_config ? JSON.parse(e.smtp_config) : null,
        page_config: e.page_config ? JSON.parse(e.page_config) : null,
        tickets: undefined
      };
    });

    res.status(200).json(parsed);
  } catch (err) {
    console.error('GET events error:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// ===== GET ALL PUBLIC EVENTS =====
router.get('/public/all', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: { organization: { select: { name: true } } },
      orderBy: { date_time: 'asc' }
    });
    const parsed = events.map(e => ({
      ...e,
      tiers: e.tiers ? JSON.parse(e.tiers) : [],
      customFormFields: undefined,
      page_config: undefined,
      smtp_config: undefined,
      upi_config: undefined,
    }));
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public events.' });
  }
});

// ===== GET SINGLE EVENT (public) =====
router.get('/public/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { tickets: true, organization: { select: { name: true } } }
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    let tiers = event.tiers ? JSON.parse(event.tiers) : [];
    tiers = tiers.map(t => {
      const sold = event.tickets.filter(tk => tk.tier_id === t.id && tk.status !== 'DECLINED').length;
      return { ...t, available: Math.max(0, parseInt(t.capacity || 100) - sold) };
    });

    res.status(200).json({
      ...event,
      available_slots: Math.max(0, event.total_capacity - event.tickets.filter(tk => tk.status !== 'DECLINED').length),
      tiers,
      customFormFields: event.customFormFields ? JSON.parse(event.customFormFields) : [],
      page_config: event.page_config ? JSON.parse(event.page_config) : null,
      smtp_config: undefined,
      tickets: undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// ===== CREATE EVENT =====
router.post('/', verifyToken, requireRole('SYSTEM_ADMIN', 'ORG_ADMIN'), async (req, res) => {
  try {
    const { title, date_time, end_time, venue, ticket_price, total_capacity, available_slots, image, tiers, customFormFields, smtp_config, page_config, ai_session_id } = req.body;
    
    if (!req.user.organization_id && req.user.role !== 'SYSTEM_ADMIN') {
      return res.status(400).json({ error: 'You must belong to an organization to create an event.' });
    }

    const eventTitle = title || 'New Event';
    const existingEvent = await prisma.event.findFirst({
      where: {
        title: eventTitle,
        organization_id: req.user.organization_id
      }
    });

    if (existingEvent) {
      return res.status(400).json({ error: 'An event with this name already exists.' });
    }

    const event = await prisma.event.create({
      data: {
        organization_id: req.user.organization_id,
        title: eventTitle,
        date_time: date_time ? new Date(date_time) : new Date(),
        end_time: end_time ? new Date(end_time) : null,
        venue: venue || 'TBD',
        ticket_price: parseFloat(ticket_price) || 0,
        total_capacity: parseInt(total_capacity) || 100,
        available_slots: parseInt(available_slots) || 100,
        image: image || null,
        tiers: tiers ? JSON.stringify(tiers) : null,
        customFormFields: customFormFields ? JSON.stringify(customFormFields) : null,
        smtp_config: smtp_config ? JSON.stringify(smtp_config) : null,
        page_config: page_config ? JSON.stringify(page_config) : null
      }
    });

    if (ai_session_id) {
      try {
        await prisma.aiChatSession.updateMany({
          where: { id: ai_session_id, user_id: req.user.id },
          data: { event_id: event.id }
        });
      } catch (e) {
        console.error('Failed to link ai session to event', e);
      }
    }

    res.status(201).json({ ...event, tiers: tiers || [], customFormFields: customFormFields || [] });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// ===== UPDATE EVENT =====
router.put('/:id', verifyToken, requireEventAccess, async (req, res) => {
  try {
    const { title, date_time, end_time, venue, ticket_price, total_capacity, available_slots, image, tiers, customFormFields, smtp_config, page_config, upi_config } = req.body;
    
    if (title) {
      const eventToUpdate = await prisma.event.findUnique({ where: { id: req.params.id } });
      if (eventToUpdate) {
        const existingEvent = await prisma.event.findFirst({
          where: {
            title: title,
            organization_id: eventToUpdate.organization_id,
            id: { not: req.params.id }
          }
        });
        if (existingEvent) {
          return res.status(400).json({ error: 'An event with this name already exists.' });
        }
      }
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title, date_time: date_time ? new Date(date_time) : undefined, end_time: end_time !== undefined ? (end_time ? new Date(end_time) : null) : undefined, venue,
        ticket_price: parseFloat(ticket_price), total_capacity: parseInt(total_capacity),
        available_slots: parseInt(available_slots),
        image: image !== undefined ? image : undefined,
        tiers: tiers ? JSON.stringify(tiers) : undefined,
        customFormFields: customFormFields ? JSON.stringify(customFormFields) : undefined,
        smtp_config: smtp_config !== undefined ? (smtp_config ? JSON.stringify(smtp_config) : null) : undefined,
        page_config: page_config !== undefined ? (page_config ? JSON.stringify(page_config) : null) : undefined,
        upi_config: upi_config !== undefined ? (upi_config ? JSON.stringify(upi_config) : null) : undefined
      }
    });
    res.status(200).json({ ...event, tiers: tiers || [], customFormFields: customFormFields || [], smtp_config: smtp_config || null, page_config: page_config || null, upi_config: upi_config || null });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

// ===== DELETE EVENT =====
router.delete('/:id', verifyToken, requireEventAccess, async (req, res) => {
  try {
    if (req.user.role === 'EVENT_MANAGER') {
      return res.status(403).json({ error: 'Only Admins can delete events.' });
    }

    const eventId = req.params.id;
    
    // Fetch event details for the email
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    
    // Fetch tickets with email info
    const tickets = await prisma.ticket.findMany({ 
      where: { event_id: eventId }, 
      select: { id: true, attendee_email: true, attendee_name: true } 
    });
    
    // Send cancellation emails
    if (tickets.length > 0 && event) {
      const transporter = getSmtpTransporter();
      if (transporter) {
        const from = process.env.SMTP_FROM || `"EventSphere" <${process.env.SMTP_USER}>`;
        const emailPromises = tickets.map(ticket => {
          if (!ticket.attendee_email) return Promise.resolve();
          return transporter.sendMail({
            from,
            to: ticket.attendee_email,
            subject: `Event Cancelled: ${event.title}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
                <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;">
                  <h2 style="color:#000000;margin:0;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Event Cancellation Notice</h2>
                </div>
                <div style="padding:40px;">
                  <p style="color:#111111;font-size:15px;margin:0 0 24px;">Dear ${ticket.attendee_name || 'Attendee'},</p>
                  <p style="color:#111111;font-size:15px;margin:0 0 20px;line-height:1.5;">We are writing to inform you that the event <strong>${event.title}</strong> is being canceled.</p>
                  <p style="color:#111111;font-size:15px;margin:0 0 28px;line-height:1.5;">Sorry for the inconvenience. Your ID pass is of no use and the money will be given back to you in a short span.</p>
                  <p style="color:#666666;font-size:14px;margin:0;">Best regards,<br/>The EventSphere Team</p>
                </div>
              </div>
            `
          }).catch(err => console.error(`Failed to send cancellation email to ${ticket.attendee_email}:`, err));
        });
        await Promise.allSettled(emailPromises);
      }
    }

    const ticketIds = tickets.map(t => t.id);
    
    if (ticketIds.length > 0) {
      await prisma.attendanceLog.deleteMany({ where: { ticket_id: { in: ticketIds } } });
      await prisma.ticket.deleteMany({ where: { event_id: eventId } });
    }
    await prisma.eventAccess.deleteMany({ where: { event_id: eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    
    res.status(204).send();
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

// ===== AI CHAT SESSIONS =====
router.get('/ai-chat/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await prisma.aiChatSession.findMany({
      where: { user_id: req.user.id },
      orderBy: { updated_at: 'desc' },
      select: { id: true, title: true, created_at: true, event_id: true }
    });
    res.status(200).json({ success: true, sessions });
  } catch (err) {
    console.error('Fetch AI chat sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

router.get('/ai-chat/history/:sessionId', verifyToken, async (req, res) => {
  try {
    const session = await prisma.aiChatSession.findFirst({
      where: { id: req.params.sessionId, user_id: req.user.id }
    });
    let history = [];
    if (session && session.messages) {
      history = JSON.parse(session.messages);
    }
    res.status(200).json({ success: true, history });
  } catch (err) {
    console.error('Fetch AI chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.delete('/ai-chat/history/:sessionId', verifyToken, async (req, res) => {
  try {
    await prisma.aiChatSession.deleteMany({
      where: { id: req.params.sessionId, user_id: req.user.id }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete AI chat history error:', err);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

// ===== AI CHAT EVENT GENERATION =====
router.post('/ai-chat', verifyToken, requireRole('SYSTEM_ADMIN', 'ORG_ADMIN'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your backend .env file.' });
    }

    const { messages, sessionId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const currentDate = new Date().toISOString().split('T')[0];

    const systemInstruction = `You are an AI assistant for EventSphere helping an event organizer create a new event.
Your goal is to gather all necessary details to create the event: Title, Date & Time, Venue, Total Capacity, Currency (INR, USD, EUR, GBP), and Ticket Tiers (Name, Price, Capacity).
Ask the user questions one at a time if information is missing. Keep your responses concise, friendly, and focused.

IMPORTANT TIME CONSTRAINT:
The current date is ${currentDate}. You MUST NOT create or suggest any events that occur before this date (or in past years). If the user asks to schedule an event in the past, politely inform them that events must be scheduled in the future and ask for a valid date.

EVENT PLANNING & ADVICE:
If the user asks for an "event planner", a "proper plan", or wants help organizing a specific type of event (like a party, wedding, etc.):
1. First, ask them for specific details about the style, culture, or theme. For example, if they want a wedding planner, ask if it's a traditional Indian wedding (which spans multiple days of ceremonies like Haldi, Sangeet, etc.) or a Western/foreigner wedding (which follows a different trend and structure). For a party, ask if it's a corporate mixer, casual birthday, theme party, etc.
2. Once they provide the context, give them a highly detailed, culturally and contextually appropriate event plan (timelines, themes, suggested activities).
3. After providing the plan, smoothly pivot back to collecting the required details (Title, Date, Venue, etc.) to finalize creating their event in the system.

VISION & IMAGE ANALYSIS:
If the user uploads an image (like a poster, flyer, venue photo, or ticket design):
1. Extract any relevant event details (Title, Date, Venue, etc.) from the text in the image and automatically use them for the event setup.
2. If the user asks for feedback on the image (e.g., "how is it", "is this venue good?", "does this poster look okay?"), you MUST act as an expert event planner and provide helpful, constructive feedback based on the visual contents of the image. DO NOT reject these questions as unrelated. 

IMPORTANT FORMATTING RULES FOR JSON OUTPUT:
- ALWAYS properly format and Title Case the event "title" and "venue" (e.g., if user says "main audi in christ university", you write "Main Audi, Christ University").
- ALWAYS format the "date" as a valid ISO-8601 string (e.g., "YYYY-MM-DDTHH:mm").

STRICT RULE: If the user asks a question completely unrelated to event creation OR the images they uploaded (e.g., coding, math, history), you MUST decline very warmly and politely. For example: "I'd love to chat about that, but my expertise is strictly limited to helping you craft amazing events! 😊 Let's get back to your event setup..." Do NOT answer irrelevant questions.

Once you have ALL the necessary information, you MUST output ONLY a JSON object representing the event data and NOTHING ELSE. Do not use markdown blocks for the JSON.
The JSON MUST match this structure exactly:
{
  "event_ready": true,
  "event_data": {
    "title": "...",
    "date": "YYYY-MM-DDTHH:mm",
    "venue": "...",
    "capacity": 100,
    "currency": "INR",
    "theme_category": "One of: Party, Tech, Music, Arts, Wellness, Abstract, Sports",
    "theme_color": "#HexCode that matches the vibe",
    "tagline": "A short catchy 3-5 word tagline",
    "tiers": [
      { "name": "General Admission", "price": 0, "capacity": 100 }
    ]
  }
}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite",
      systemInstruction: systemInstruction 
    });

    const geminiMessages = messages.map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      if (m.image) {
        // Parse data URL: "data:image/png;base64,..."
        const matches = m.image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }
      return { role, parts };
    });

    const result = await model.generateContent({
      contents: geminiMessages
    });
    
    let reply = result.response.text().trim();
    
    // Check if reply is the final JSON
    let parsedJson = null;
    try {
      if (reply.includes('"event_ready":')) {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      // Not valid json, ignore
    }

    const newHistory = [...messages, { role: 'assistant', content: reply }];
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      // Create new session
      const titleMatch = newHistory[0]?.content?.substring(0, 40) || 'New Event Plan';
      const session = await prisma.aiChatSession.create({
        data: {
          user_id: req.user.id,
          title: titleMatch,
          messages: JSON.stringify(newHistory)
        }
      });
      currentSessionId = session.id;
    } else {
      // Update existing session
      await prisma.aiChatSession.updateMany({
        where: { id: currentSessionId, user_id: req.user.id },
        data: { messages: JSON.stringify(newHistory) }
      });
    }

    if (parsedJson && parsedJson.event_ready) {
      return res.status(200).json({
        success: true,
        is_ready: true,
        event_data: parsedJson.event_data,
        sessionId: currentSessionId
      });
    }

    res.status(200).json({
      success: true,
      is_ready: false,
      message: reply,
      sessionId: currentSessionId
    });

  } catch (err) {
    console.error('AI chat error:', err);
    if ((err.message && err.message.includes('fetch failed')) || String(err).includes('fetch failed')) {
      return res.status(503).json({ error: 'Network error: Failed to connect to the AI service. Please check your internet connection.' });
    }
    res.status(500).json({ error: 'Failed to process AI chat. Make sure your API key is correct.' });
  }
});

// ===== SEND OTP FOR REGISTRATION =====
router.post('/:id/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const eventId = req.params.id;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const smtpConfig = event.smtp_config ? JSON.parse(event.smtp_config) : null;
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user) {
      return res.status(400).json({ error: 'Event does not have SMTP configured for sending OTP.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.otpVerification.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { otp, expires_at, is_verified: false },
      create: { email: email.toLowerCase().trim(), otp, expires_at }
    });

    await transporter.sendMail({
      from: `"${event.title}" <${smtpConfig.user}>`,
      to: email.toLowerCase().trim(),
      subject: `Your OTP for ${event.title}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
          <div style="padding:40px 40px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa;text-align:center;">
            <h2 style="color:#000000;margin:0;font-size:24px;font-weight:600;letter-spacing:-0.5px;">${event.title}</h2>
          </div>
          
          <div style="padding:40px;text-align:center;">
            <h3 style="color:#111111;margin-top:0;margin-bottom:20px;font-size:20px;font-weight:600;">Ticket Claim Verification</h3>
            <p style="color:#666666;font-size:15px;line-height:1.6;margin-bottom:30px;">
              Use the following one-time password to verify your email and securely claim your event pass.
            </p>
            
            <div style="background:#fafafa;border-radius:8px;padding:24px;margin-bottom:30px;border:1px solid #e5e5e5;">
              <h1 style="color:#000000;margin:0;font-size:42px;letter-spacing:12px;font-weight:700;padding-left:12px;font-family:monospace;">${otp}</h1>
            </div>
            
            <p style="color:#666666;font-size:13px;margin-bottom:0;">
              This code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
            </p>
          </div>
          
          <div style="padding:20px 40px;text-align:center;border-top:1px solid #e5e5e5;background:#fafafa;">
            <p style="color:#999999;font-size:12px;margin:0;">
              &copy; ${new Date().getFullYear()} EventSphere. All rights reserved.
            </p>
          </div>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// ===== VERIFY OTP FOR REGISTRATION =====
router.post('/:id/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const record = await prisma.otpVerification.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!record || record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or incorrect OTP.' });
    }

    if (new Date() > record.expires_at) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { is_verified: true }
    });

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

module.exports = router;
