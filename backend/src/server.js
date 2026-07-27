const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient({});
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Load env variables if present
require('dotenv').config({ path: __dirname + '/../../.env' }).parsed;

const nodemailer = require('nodemailer');

// Set up email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER || 'mylene.mayer@ethereal.email',
        pass: process.env.SMTP_PASS || '6n9P5V6xKQmP4N7F8U'
    }
});
// Event CRUD Endpoints
app.get('/api/v1/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        tickets: true
      }
    });
    // Parse the JSON strings back into objects before sending
    const parsedEvents = events.map(e => {
      let tiers = e.tiers ? JSON.parse(e.tiers) : [];
      tiers = tiers.map(t => {
        const sold = e.tickets.filter(tk => tk.tier_id === t.id).length;
        return { ...t, available: Math.max(0, parseInt(t.capacity || 100) - sold) };
      });
      const totalSold = e.tickets.length;
      
      return {
        ...e,
        available_slots: Math.max(0, e.total_capacity - totalSold),
        tiers,
        customFormFields: e.customFormFields ? JSON.parse(e.customFormFields) : [],
        smtp_config: e.smtp_config ? JSON.parse(e.smtp_config) : null,
        page_config: e.page_config ? JSON.parse(e.page_config) : null,
        tickets: undefined // Don't send all tickets to the frontend event list
      };
    });
    res.status(200).json(parsedEvents);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/v1/events', async (req, res) => {
  try {
    const { title, date_time, venue, ticket_price, total_capacity, available_slots, image, tiers, customFormFields, smtp_config, page_config } = req.body;
    const event = await prisma.event.create({
      data: {
        title: title || 'New Event',
        date_time: date_time ? new Date(date_time) : new Date(),
        venue: venue || 'TBD',
        ticket_price: parseFloat(ticket_price) || 0,
        total_capacity: parseInt(total_capacity) || 100,
        available_slots: parseInt(available_slots) || 100,
        image: image || null,
        tiers: tiers ? JSON.stringify(tiers) : null,
        customFormFields: customFormFields ? JSON.stringify(customFormFields) : null,
        smtp_config: smtp_config ? JSON.stringify(smtp_config) : null,
        page_config: page_config ? JSON.stringify(page_config) : null,
      }
    });
    res.status(201).json({ ...event, tiers: tiers || [], customFormFields: customFormFields || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/v1/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date_time, venue, ticket_price, total_capacity, available_slots, image, tiers, customFormFields, smtp_config, page_config } = req.body;
    const event = await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        title,
        date_time: date_time ? new Date(date_time) : undefined,
        venue,
        ticket_price: parseFloat(ticket_price),
        total_capacity: parseInt(total_capacity),
        available_slots: parseInt(available_slots),
        image: image !== undefined ? image : undefined,
        tiers: tiers ? JSON.stringify(tiers) : undefined,
        customFormFields: customFormFields ? JSON.stringify(customFormFields) : undefined,
        smtp_config: smtp_config !== undefined ? (smtp_config ? JSON.stringify(smtp_config) : null) : undefined,
        page_config: page_config !== undefined ? (page_config ? JSON.stringify(page_config) : null) : undefined,
      }
    });
    res.status(200).json({ ...event, tiers: tiers || [], customFormFields: customFormFields || [], smtp_config: smtp_config || null, page_config: page_config || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/v1/events/:id', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    // First delete attendance logs for all tickets of this event
    const tickets = await prisma.ticket.findMany({ where: { event_id: eventId }, select: { id: true } });
    const ticketIds = tickets.map(t => t.id);
    if (ticketIds.length > 0) {
      await prisma.attendanceLog.deleteMany({ where: { ticket_id: { in: ticketIds } } });
      await prisma.ticket.deleteMany({ where: { event_id: eventId } });
    }
    await prisma.event.delete({ where: { id: eventId } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get all tickets
app.get('/api/v1/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({ include: { event: true } });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Delete a ticket
app.delete('/api/v1/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await prisma.$transaction(async (tx) => {
      // First delete associated attendance logs
      await tx.attendanceLog.deleteMany({
        where: { ticket_id: id }
      });
      // Delete the ticket
      await tx.ticket.delete({
        where: { id }
      });
      // No need to manually increment JSON tier availability because GET /events calculates it dynamically from the tickets table!
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// Book Ticket & Send Email Endpoint
app.post('/api/v1/tickets/book', async (req, res) => {
  const { attendee } = req.body;
  if (!attendee || !attendee.email) {
    return res.status(400).json({ success: false, message: 'Attendee email required' });
  }

  try {
    // 1. Save ticket to DB
    const dbTicket = await prisma.ticket.create({
      data: {
        id: attendee.passId,
        event_id: attendee.eventId,
        attendee_name: attendee.name,
        student_roll_no: attendee.student_roll_no || attendee.passId,
        attendee_email: attendee.email,
        attendee_phone: attendee.phone,
        tier_id: attendee.tierId,
        tier_name: attendee.tierName,
        custom_data: attendee.customData ? JSON.stringify(attendee.customData) : null
      }
    });

    // 2. We don't need to manually decrement JSON tier availability here!
    // The GET /events endpoint now calculates it dynamically by counting tickets in the DB.
    // This perfectly prevents race conditions when multiple users book simultaneously.

    // 3. Send email using event-specific SMTP configuration if available
    let messageId = null;
    try {
      const eventWithSmtp = await prisma.event.findUnique({
        where: { id: attendee.eventId },
        select: { smtp_config: true }
      });
      
      let customTransporter = transporter; // fallback to global/ethereal
      let fromAddress = '"EventSphere" <noreply@eventsphere.com>';
      
      if (eventWithSmtp?.smtp_config) {
        const smtp = JSON.parse(eventWithSmtp.smtp_config);
        if (smtp.host && smtp.user && smtp.pass) {
          customTransporter = nodemailer.createTransport({
            host: smtp.host,
            port: parseInt(smtp.port) || 587,
            secure: smtp.port == 465,
            auth: {
              user: smtp.user,
              pass: smtp.pass
            }
          });
          fromAddress = smtp.fromEmail || `"${attendee.eventTitle}" <${smtp.user}>`;
        }
      }

      const info = await customTransporter.sendMail({
        from: fromAddress,
        to: attendee.email,
        subject: `Your Pass for ${attendee.eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 12px;">
            <h2 style="color: #0f172a;">You're going to ${attendee.eventTitle}!</h2>
            <p style="color: #475569; font-size: 16px;">Hi ${attendee.name},</p>
            <p style="color: #475569; font-size: 16px;">Your <strong>${attendee.tierName}</strong> pass has been confirmed.</p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0f172a;">Pass Details</h3>
              <p style="margin: 5px 0; color: #475569;"><strong>Date:</strong> ${attendee.eventDate}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Venue:</strong> ${attendee.eventVenue}</p>
              <p style="margin: 5px 0; color: #475569;"><strong>Pass ID:</strong> ${attendee.passId}</p>
            </div>
            <p style="color: #475569; font-size: 14px;">Please keep this ID handy for scanning at the venue.</p>
          </div>
        `
      });
      messageId = info.messageId;
      console.log('Message sent: %s', info.messageId);
    } catch (emailError) {
      console.error('Email sending failed (ignored):', emailError.message);
    }

    res.status(200).json({ success: true, messageId: messageId, ticket: dbTicket });
  } catch (error) {
    console.error('Ticket Booking Error:', error);
    res.status(500).json({ success: false, message: 'Failed to book ticket' });
  }
});


// Ticket Scanner POST Endpoint
app.post('/api/v1/tickets/scan', async (req, res) => {
  const { ticketId, scannerId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ success: false, message: 'Ticket ID is required' });
  }

  try {
    // We use a transaction to prevent race conditions during scanning
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch ticket using Row-Level lock (For Update) to handle concurrency
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // 2. Evaluate State Machine transitions
      switch (ticket.status) {
        case 'OUTSIDE':
          // Update status to INSIDE and log Entry
          await tx.ticket.update({
            where: { id: ticketId },
            data: { status: 'INSIDE' }
          });
          await tx.attendanceLog.create({
            data: {
              ticket_id: ticketId,
              action_type: 'ENTRY',
              roll_number: ticket.student_roll_no
            }
          });
          return {
            success: true,
            status: 'INSIDE',
            message: 'Access Granted. Welcome!',
            attendee: {
              name: ticket.attendee_name,
              roll_number: ticket.student_roll_no
            }
          };

        case 'INSIDE':
          // Duplicate entry attempt
          await tx.attendanceLog.create({
            data: {
              ticket_id: ticketId,
              action_type: 'DENIED',
              roll_number: ticket.student_roll_no
            }
          });
          return {
            success: false,
            status: 'INSIDE',
            message: 'Validation Error: Ticket already scanned inside.',
            attendee: {
              name: ticket.attendee_name,
              roll_number: ticket.student_roll_no
            }
          };

        case 'TEMPORARY_EXIT':
          // Re-entry check: require identity cross-examination
          await tx.attendanceLog.create({
            data: {
              ticket_id: ticketId,
              action_type: 'TEMPORARY_EXIT_CHECK',
              roll_number: ticket.student_roll_no
            }
          });
          return {
            success: true,
            status: 'TEMPORARY_EXIT',
            message: 'Manual Identity Verification Required',
            attendee: {
              name: ticket.attendee_name,
              roll_number: ticket.student_roll_no,
              // Simulated saved metadata URL
              photo_url: `https://avatar.vercel.sh/${ticket.student_roll_no}`
            }
          };

        default:
          throw new Error('Unknown ticket status');
      }
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Scan Error:', error);
    if (error.message === 'Ticket not found') {
      return res.status(404).json({ success: false, message: 'Invalid Ticket' });
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Scanner API listening at http://localhost:${PORT}`);
});
