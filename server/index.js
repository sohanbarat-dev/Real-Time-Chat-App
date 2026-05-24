require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// REST endpoint: get message history for a room
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Track active users per room: { room: Set(socketId) }
const rooms = {};
const userMap = {}; // socketId -> { username, room, avatar }

const AVATAR_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#a855f7','#ec4899'
];

function getRoomUsers(room) {
  if (!rooms[room]) return [];
  return [...rooms[room]].map(id => userMap[id]).filter(Boolean);
}

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a room
  socket.on('join', async ({ username, room, avatar }) => {
    // Leave previous room if any
    const prev = userMap[socket.id];
    if (prev) {
      socket.leave(prev.room);
      if (rooms[prev.room]) rooms[prev.room].delete(socket.id);
      io.to(prev.room).emit('user_left', { username: prev.username, users: getRoomUsers(prev.room) });
    }

    userMap[socket.id] = { username, room, avatar };
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    socket.join(room);

    // Send message history
    try {
      const history = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit('history', history.reverse());
    } catch (e) {
      socket.emit('history', []);
    }

    // Notify room of new user
    io.to(room).emit('user_joined', {
      username,
      users: getRoomUsers(room)
    });

    // System message
    socket.to(room).emit('system_message', {
      text: `${username} joined the room`,
      createdAt: new Date()
    });

    console.log(`👤 ${username} joined #${room}`);
  });

  // Handle chat message
  socket.on('send_message', async ({ text }) => {
    const user = userMap[socket.id];
    if (!user || !text?.trim()) return;

    try {
      const msg = await Message.create({
        username: user.username,
        text: text.trim(),
        room: user.room,
        avatar: user.avatar
      });

      io.to(user.room).emit('receive_message', {
        _id: msg._id,
        username: msg.username,
        text: msg.text,
        room: msg.room,
        avatar: msg.avatar,
        createdAt: msg.createdAt
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', ({ isTyping }) => {
    const user = userMap[socket.id];
    if (!user) return;
    socket.to(user.room).emit('typing', { username: user.username, isTyping });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = userMap[socket.id];
    if (user) {
      if (rooms[user.room]) rooms[user.room].delete(socket.id);
      io.to(user.room).emit('user_left', {
        username: user.username,
        users: getRoomUsers(user.room)
      });
      socket.to(user.room).emit('system_message', {
        text: `${user.username} left the room`,
        createdAt: new Date()
      });
      delete userMap[socket.id];
      console.log(`👋 ${user.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
