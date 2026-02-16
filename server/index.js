const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/message');
const aiRoutes = require('./routes/ai');
const statusRoutes = require('./routes/status');
const uploadRoutes = require('./routes/upload');
const socketHandler = require('./socket/handler');
const { initScheduler } = require('./utils/scheduler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for file transfers
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
socketHandler(io);
app.set('io', io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    // --- Migration: clean up old indexes that conflict with new schema ---
    try {
      const User = require('./models/User');
      const collection = mongoose.connection.collection('users');
      const indexes = await collection.indexes();

      // Drop old email unique index if it exists (non-sparse)
      const emailIdx = indexes.find(
        (idx) => idx.key && idx.key.email && idx.unique && !idx.sparse
      );
      if (emailIdx) {
        await collection.dropIndex(emailIdx.name);
        console.log('🔧 Dropped old email unique index');
      }

      // Drop old phone unique index if it's non-sparse
      const phoneIdx = indexes.find(
        (idx) => idx.key && idx.key.phone && idx.unique && !idx.sparse
      );
      if (phoneIdx) {
        await collection.dropIndex(phoneIdx.name);
        console.log('🔧 Dropped old phone unique index');
      }

      // Ensure existing email-based users are marked as profile-complete
      // so they can still log in with the new OTP system using their phone
      await User.updateMany(
        { email: { $exists: true, $ne: null }, isProfileComplete: { $ne: true } },
        { $set: { isProfileComplete: true } }
      );

      // Sync new indexes
      await User.syncIndexes();
      console.log('🔧 Database indexes synced');
    } catch (migrationErr) {
      console.log('⚠️  Migration note:', migrationErr.message);
    }

    initScheduler(io);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 OTP Provider: ${process.env.OTP_PROVIDER || 'console'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
