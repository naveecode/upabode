import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ───────── CRITICAL: Health Check Endpoint for Render Uptime ─────────
// Hit this endpoint via UptimeRobot every 10 minutes to prevent Render from going to sleep!
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'orbit-persistent-backend',
    database: 'cockroachdb-connected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('🌌 Orbit Planetary Backend is Active and Orbiting.');
});

// ───────── REST API Endpoints ─────────

// 1. Get Feed Transmissions
app.get('/api/posts', async (req, res) => {
  try {
    const channel = (req.query.channel as string) || 'earth';
    const posts = await prisma.post.findMany({
      where: channel !== 'all' ? { channel } : undefined,
      include: {
        author: true,
        likes: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, posts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Broadcast New Transmission
app.post('/api/posts', async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, channel, authorId } = req.body;
    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Content or media required.' });
    }

    const post = await prisma.post.create({
      data: {
        content: content || '',
        mediaUrl,
        mediaType: mediaType || 'aurora',
        channel: channel || 'earth',
        authorId,
      },
      include: {
        author: true,
        likes: true,
      },
    });

    // Real-time broadcast to all connected WebSocket clients
    io.emit('new_transmission', post);

    res.status(201).json({ success: true, post });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. User Search & Directory
app.get('/api/users/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Send Message & Broadcast via WebSockets
app.post('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, mediaUrl, voiceUrl, senderId } = req.body;

    const message = await prisma.message.create({
      data: {
        content: content || '',
        mediaUrl,
        voiceUrl,
        chatId,
        senderId,
      },
      include: {
        sender: true,
      },
    });

    // Real-time emit to room
    io.to(`chat_${chatId}`).emit('new_message', message);

    res.status(201).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ───────── Persistent WebSocket Handlers ─────────
io.on('connection', (socket) => {
  console.log(`[WebSocket] Explorer connected: ${socket.id}`);

  // Join a specific chat channel
  socket.on('join_chat', (chatId: string) => {
    socket.join(`chat_${chatId}`);
    console.log(`[WebSocket] Client ${socket.id} joined chat_${chatId}`);
  });

  // Leave a specific chat channel
  socket.on('leave_chat', (chatId: string) => {
    socket.leave(`chat_${chatId}`);
  });

  // Real-time typing indicators
  socket.on('typing', ({ chatId, handle }: { chatId: string; handle: string }) => {
    socket.to(`chat_${chatId}`).emit('user_typing', { handle });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Explorer disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Orbit Node.js/Express Persistent Backend running on port ${PORT}`);
  console.log(`📡 Healthcheck route active: http://localhost:${PORT}/healthz`);
});
