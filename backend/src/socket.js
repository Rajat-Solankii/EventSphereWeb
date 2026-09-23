const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket] User connected: ${socket.user.id}`);
    
    // Join a room specific to this user to receive direct notifications
    socket.join(socket.user.id);

    // Event managers / attendees can join specific event rooms for live attendance updates
    socket.on('join_event', (eventId) => {
      socket.join(`event_${eventId}`);
      // console.log(`[Socket] User ${socket.user.id} joined room event_${eventId}`);
    });

    socket.on('leave_event', (eventId) => {
      socket.leave(`event_${eventId}`);
      // console.log(`[Socket] User ${socket.user.id} left room event_${eventId}`);
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket] User disconnected: ${socket.user.id}`);
    });

    // ===== AI CHAT STREAMING =====
    socket.on('ai_chat_message', async ({ sessionId, messages }) => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return socket.emit('ai_chat_error', { error: 'Gemini API Key is missing.' });
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const currentDate = new Date().toISOString().split('T')[0];
        const systemInstruction = `You are a friendly, enthusiastic, and expert event planner AI for EventSphere. 
Your ultimate goal is to help the user create an event by gathering necessary details (Title, Date & Time, Venue, Total Capacity, Currency, and Ticket Tiers).
However, DO NOT interrogate the user by immediately asking for these details like a robot. 
Instead:
- When a user says hello, respond warmly and conversationally (e.g., "Hi there! I'd love to help you plan an amazing event. What kind of event are we talking about?").
- Act as a true event planning partner. Brainstorm with them if they need ideas.
- As the conversation flows naturally, gently guide them to provide the required details one at a time.
- Keep your responses concise, friendly, and focused.

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
          model: "gemini-1.5-flash",
          systemInstruction: systemInstruction 
        });

        const geminiMessages = messages.map(m => {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const parts = [];
          if (m.content) parts.push({ text: m.content });
          if (m.image) {
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

        const resultStream = await model.generateContentStream({
          contents: geminiMessages
        });

        let fullReply = '';
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          fullReply += chunkText;
          socket.emit('ai_chat_chunk', { chunk: chunkText });
        }

        let parsedJson = null;
        try {
          const firstIdx = fullReply.indexOf('{');
          const lastIdx = fullReply.lastIndexOf('}');
          if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx) {
            const jsonStr = fullReply.substring(firstIdx, lastIdx + 1);
            parsedJson = JSON.parse(jsonStr);
          }
        } catch (e) {
          console.error('[Socket] AI JSON Parse Error:', e.message);
        }

        const newHistory = [...messages, { role: 'assistant', content: fullReply }];
        let currentSessionId = sessionId;

        if (!currentSessionId) {
          const titleMatch = newHistory[0]?.content?.substring(0, 40) || 'New Event Plan';
          const session = await prisma.aiChatSession.create({
            data: {
              user_id: socket.user.id,
              title: titleMatch,
              messages: JSON.stringify(newHistory)
            }
          });
          currentSessionId = session.id;
        } else {
          await prisma.aiChatSession.updateMany({
            where: { id: currentSessionId, user_id: socket.user.id },
            data: { messages: JSON.stringify(newHistory) }
          });
        }

        socket.emit('ai_chat_done', { 
          fullReply, 
          sessionId: currentSessionId,
          parsedJson 
        });

      } catch (err) {
        console.error('AI chat socket error:', err);
        socket.emit('ai_chat_error', { error: 'Failed to process AI chat request.' });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
