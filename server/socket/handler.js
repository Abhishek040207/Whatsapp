const User = require('../models/User');
const Call = require('../models/Call');

// Track online users: { userId: socketId }
const onlineUsers = new Map();

module.exports = function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── User Setup ───
    socket.on('setup', async (userId) => {
      if (!userId) return;
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      } catch (err) {
        console.error('Error updating online status:', err.message);
      }

      socket.broadcast.emit('user-online', userId);

      // Send current online users list to newly connected user
      socket.emit('online-users', Array.from(onlineUsers.keys()));

      console.log(`✅ User ${userId} is online`);
    });

    // ─── Chat Room ───
    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
    });

    // ─── Typing Indicators ───
    socket.on('typing', ({ chatId, userId, userName }) => {
      socket.to(chatId).emit('typing', { chatId, userId, userName });
    });

    socket.on('stop-typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('stop-typing', { chatId, userId });
    });

    // ─── Message Relay ───
    socket.on('new-message', (message) => {
      const chat = message.chat;
      if (!chat || !chat.participants) return;

      chat.participants.forEach((participant) => {
        if (participant._id === message.sender._id) return;
        socket.to(participant._id).emit('message-received', message);
      });
    });

    // ─── Read Receipts ───
    socket.on('read-receipt', ({ chatId, userId }) => {
      socket.to(chatId).emit('messages-read', { chatId, readBy: userId });
    });

    // ─── Message Reactions ───
    socket.on('message-reaction', (data) => {
      socket.to(data.chatId).emit('message-reaction', data);
    });

    // ─── WebRTC Signaling — Voice & Video Calls ───
    socket.on('call-user', async ({ to, from, signal, callType, callerInfo }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        // Create call record
        try {
          const call = await Call.create({
            caller: from,
            receiver: to,
            type: callType,
            status: 'missed', // default until answered
          });
          io.to(to).emit('incoming-call', {
            signal,
            from,
            callType,
            callerInfo,
            callId: call._id,
          });
        } catch (err) {
          console.error('Call record error:', err.message);
          io.to(to).emit('incoming-call', {
            signal,
            from,
            callType,
            callerInfo,
          });
        }
      } else {
        socket.emit('call-unavailable', { to, reason: 'User is offline' });
      }
    });

    socket.on('call-accepted', async ({ to, signal, callId }) => {
      io.to(to).emit('call-accepted', { signal });
      // Update call record
      if (callId) {
        try {
          await Call.findByIdAndUpdate(callId, {
            status: 'answered',
            startedAt: new Date(),
          });
        } catch (err) {
          console.error('Call update error:', err.message);
        }
      }
    });

    socket.on('call-rejected', async ({ to, callId }) => {
      io.to(to).emit('call-rejected');
      if (callId) {
        try {
          await Call.findByIdAndUpdate(callId, { status: 'rejected' });
        } catch (err) {
          console.error('Call update error:', err.message);
        }
      }
    });

    socket.on('call-ended', async ({ to, callId }) => {
      io.to(to).emit('call-ended');
      if (callId) {
        try {
          await Call.findByIdAndUpdate(callId, {
            status: 'ended',
            endedAt: new Date(),
          });
        } catch (err) {
          console.error('Call update error:', err.message);
        }
      }
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { candidate, from: socket.userId });
    });

    // ─── Status Updates ───
    socket.on('status-update', (status) => {
      socket.broadcast.emit('new-status', status);
    });

    // ─── Disconnect ───
    socket.on('disconnect', async () => {
      let disconnectedUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        onlineUsers.delete(disconnectedUserId);
        try {
          await User.findByIdAndUpdate(disconnectedUserId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error('Error updating offline status:', err.message);
        }
        socket.broadcast.emit('user-offline', {
          userId: disconnectedUserId,
          lastSeen: new Date(),
        });
        console.log(`❌ User ${disconnectedUserId} went offline`);
      }
    });
  });

  io.getOnlineUsers = () => Object.fromEntries(onlineUsers);
};
