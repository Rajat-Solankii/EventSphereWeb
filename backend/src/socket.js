const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const { getEventAISystemInstruction } = require('./utils/aiPrompt');
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
        const systemInstruction = getEventAISystemInstruction(currentDate);
        
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.1-flash-lite",
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

        let fullReply = '';
        try {
          const resultStream = await model.generateContentStream({
            contents: geminiMessages
          });
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            fullReply += chunkText;
            socket.emit('ai_chat_chunk', { chunk: chunkText });
          }
        } catch (err) {
          console.warn("Primary model failed, falling back to Groq");
          const Groq = require('groq-sdk');
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
          const groqMessages = [
            { role: 'system', content: systemInstruction },
            ...messages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content || ''
            }))
          ];
          const chatCompletion = await groq.chat.completions.create({
            messages: groqMessages,
            model: 'openai/gpt-oss-120b',
            stream: true
          });
          for await (const chunk of chatCompletion) {
            const chunkText = chunk.choices[0]?.delta?.content || '';
            if (chunkText) {
              fullReply += chunkText;
              socket.emit('ai_chat_chunk', { chunk: chunkText });
            }
          }
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
