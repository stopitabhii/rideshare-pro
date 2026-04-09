const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');  // ← NEW: For Socket.io
const socketIo = require('socket.io');  // ← NEW: WebSocket support
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);  // ← NEW: Create HTTP server

// ← NEW: Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",  // Frontend URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware 
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rides', require('./routes/rides'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚗 RideShare API is running!' });
});

// ========== SOCKET.IO REAL-TIME FEATURES ==========

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // ========== LIVE GPS TRACKING ==========
  
  // Driver shares location
  socket.on('share-location', (data) => {
    const { rideId, latitude, longitude, driverId, driverName } = data;
    console.log(`📍 Location update from ${driverName}:`, { latitude, longitude });
    
    // Broadcast to all users in this ride
    io.to(rideId).emit('location-update', {
      driverId,
      driverName,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  });

  // User joins a ride room for tracking
  socket.on('join-ride-tracking', (rideId) => {
    socket.join(rideId);
    console.log(`👤 User ${socket.id} joined ride tracking: ${rideId}`);
    
    // Notify others in the room
    socket.to(rideId).emit('user-joined-tracking', {
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // User leaves ride tracking
  socket.on('leave-ride-tracking', (rideId) => {
    socket.leave(rideId);
    console.log(`👋 User ${socket.id} left ride tracking: ${rideId}`);
  });

  // ========== IN-APP CHAT ==========
  
  // Join chat room
  socket.on('join-chat', (rideId) => {
    socket.join(`chat_${rideId}`);
    console.log(`💬 User ${socket.id} joined chat: ${rideId}`);
    
    // Notify others
    socket.to(`chat_${rideId}`).emit('user-joined-chat', {
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Send message
  socket.on('send-message', (message) => {
    const { rideId, senderId, senderName, text } = message;
    
    const formattedMessage = {
      messageId: Date.now().toString(),
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString()
    };
    
    console.log(`💬 Message in ride ${rideId} from ${senderName}: ${text}`);
    
    // Broadcast to all users in this chat room
    io.to(`chat_${rideId}`).emit('new-message', formattedMessage);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { rideId, userName } = data;
    socket.to(`chat_${rideId}`).emit('user-typing', { userName });
  });

  socket.on('stop-typing', (data) => {
    const { rideId } = data;
    socket.to(`chat_${rideId}`).emit('user-stopped-typing');
  });

  // ========== RIDE STATUS UPDATES ==========
  
  // Ride started
  socket.on('ride-started', (data) => {
    const { rideId, driverName } = data;
    io.to(rideId).emit('ride-status-update', {
      status: 'ongoing',
      message: `${driverName} has started the ride`,
      timestamp: new Date().toISOString()
    });
  });

  // Ride completed
  socket.on('ride-completed', (data) => {
    const { rideId } = data;
    io.to(rideId).emit('ride-status-update', {
      status: 'completed',
      message: 'Ride completed successfully!',
      timestamp: new Date().toISOString()
    });
  });

  // ========== EMERGENCY SOS ==========
  
  socket.on('emergency-sos', (data) => {
    const { rideId, userId, userName, latitude, longitude } = data;
    
    console.log(`🚨 EMERGENCY SOS from ${userName} at`, { latitude, longitude });
    
    // Alert all users in the ride
    io.to(rideId).emit('sos-alert', {
      userId,
      userName,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      message: `🚨 EMERGENCY: ${userName} triggered SOS`
    });
    
    // Also alert admin/platform (you can add admin room)
    io.emit('admin-sos-alert', {
      rideId,
      userId,
      userName,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  });

  // ========== NOTIFICATIONS ==========
  
  // New booking notification
  socket.on('notify-booking', (data) => {
    const { driverId, passengerName, rideDetails } = data;
    
    // Send to specific driver
    io.to(`user_${driverId}`).emit('booking-notification', {
      title: '🚗 New Booking!',
      message: `${passengerName} booked your ride`,
      rideDetails,
      timestamp: new Date().toISOString()
    });
  });

  // User-specific room (for personal notifications)
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined personal notification room`);
  });

  // ========== DISCONNECT ==========
  
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;

// ← IMPORTANT: Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}\n`);
  console.log('✅ Features enabled:');
  console.log('   - Live GPS Tracking');
  console.log('   - In-App Chat');
  console.log('   - Real-time Notifications');
  console.log('   - Emergency SOS');
  console.log('');
});