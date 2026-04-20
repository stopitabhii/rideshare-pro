const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://rideshare-pro.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

connectDB();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://rideshare-pro.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'RideShare API is running!', version: '2.0.0' });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ── GPS Tracking ──────────────────────────────────────────────────────────
  socket.on('share-location', (data) => {
    const { rideId, latitude, longitude, driverId, driverName } = data;
    io.to(rideId).emit('location-update', {
      driverId,
      driverName,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('join-ride-tracking', (rideId) => {
    socket.join(rideId);
    socket.to(rideId).emit('user-joined-tracking', {
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave-ride-tracking', (rideId) => {
    socket.leave(rideId);
  });

  // ── In-App Chat ───────────────────────────────────────────────────────────
  socket.on('join-chat', (rideId) => {
    socket.join(`chat_${rideId}`);
    socket.to(`chat_${rideId}`).emit('user-joined-chat', {
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('send-message', (message) => {
    const { rideId, senderId, senderName, text } = message;
    const formatted = {
      messageId: Date.now().toString(),
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString()
    };
    io.to(`chat_${rideId}`).emit('new-message', formatted);
  });

  socket.on('typing', ({ rideId, userName }) => {
    socket.to(`chat_${rideId}`).emit('user-typing', { userName });
  });

  socket.on('stop-typing', ({ rideId }) => {
    socket.to(`chat_${rideId}`).emit('user-stopped-typing');
  });

  // ── Ride Status ───────────────────────────────────────────────────────────
  socket.on('ride-started', ({ rideId, driverName }) => {
    io.to(rideId).emit('ride-status-update', {
      status: 'ongoing',
      message: `${driverName} has started the ride`,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('ride-completed', ({ rideId }) => {
    io.to(rideId).emit('ride-status-update', {
      status: 'completed',
      message: 'Ride completed! Please rate your experience.',
      timestamp: new Date().toISOString()
    });
  });

  // ── Emergency SOS ─────────────────────────────────────────────────────────
  socket.on('emergency-sos', (data) => {
    const { rideId, userId, userName, latitude, longitude } = data;
    console.error(`EMERGENCY SOS from ${userName} at`, { latitude, longitude });

    io.to(rideId).emit('sos-alert', {
      userId,
      userName,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      message: `EMERGENCY: ${userName} triggered SOS`
    });

    // Broadcast to admin monitoring room
    io.to('admin-room').emit('admin-sos-alert', {
      rideId, userId, userName, latitude, longitude,
      timestamp: new Date().toISOString()
    });
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('join-admin-room', (secret) => {
    if (secret === process.env.ADMIN_SECRET) {
      socket.join('admin-room');
      console.log('Admin joined monitoring room');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`HTTP: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}\n`);
  console.log('Features active:');
  console.log('  - ID Verification (Cloudinary)');
  console.log('  - Ratings & Reviews');
  console.log('  - Cancel Booking / Ride');
  console.log('  - Auto Distance (Google Maps)');
  console.log('  - Org Leaderboard');
  console.log('  - Live GPS Tracking');
  console.log('  - In-App Chat');
  console.log('  - Emergency SOS');
  console.log('');
});