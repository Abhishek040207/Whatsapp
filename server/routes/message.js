const express = require('express');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const ScheduledMessage = require('../models/ScheduledMessage');
const { protect } = require('../middleware/auth');
const { scheduleMessage } = require('../utils/scheduler');

const router = express.Router();

// POST /api/message — send a message
router.post('/', protect, async (req, res) => {
  try {
    const { chatId, content, type, fileUrl, fileName, fileSize } = req.body;

    if (!chatId || (!content && !fileUrl)) {
      return res.status(400).json({ message: 'chatId and content are required' });
    }

    let message = await Message.create({
      sender: req.user._id,
      chat: chatId,
      content: content || '',
      type: type || 'text',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      readBy: [req.user._id],
    });

    // Update last message in chat
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    message = await message.populate('sender', 'name avatar phone');
    message = await message.populate('chat');
    message = await message.populate({
      path: 'chat.participants',
      select: 'name avatar phone',
    });

    // Emit via socket
    const io = req.app.get('io');
    const chat = await Chat.findById(chatId);
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        io.to(participantId.toString()).emit('new-message', message);
      }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/message/:chatId — get all messages for a chat
router.get('/:chatId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name avatar phone')
      .populate('readBy', 'name')
      .populate('reactions.user', 'name avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/message/read/:chatId — mark messages as read
router.put('/read/:chatId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      {
        chat: req.params.chatId,
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id }, isDelivered: true }
    );

    const io = req.app.get('io');
    const chat = await Chat.findById(req.params.chatId);
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        io.to(participantId.toString()).emit('messages-read', {
          chatId: req.params.chatId,
          readBy: req.user._id,
        });
      }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/message/react/:id — add/toggle reaction
router.put('/react/:id', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    // Add new reaction (if emoji provided)
    if (emoji) {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();
    await message.populate('reactions.user', 'name avatar');

    // Broadcast reaction update
    const io = req.app.get('io');
    const chat = await Chat.findById(message.chat);
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message-reaction', {
        messageId: message._id,
        chatId: message.chat,
        reactions: message.reactions,
      });
    });

    res.json({ reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/message/schedule — schedule a message
router.post('/schedule', protect, async (req, res) => {
  try {
    const { chatId, content, scheduledTime } = req.body;

    if (!chatId || !content || !scheduledTime) {
      return res.status(400).json({
        message: 'chatId, content, and scheduledTime are required',
      });
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    const scheduled = await ScheduledMessage.create({
      sender: req.user._id,
      chat: chatId,
      content,
      scheduledTime: scheduleDate,
    });

    const io = req.app.get('io');
    scheduleMessage(scheduled, io);

    res.status(201).json(scheduled);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/message/scheduled/:chatId
router.get('/scheduled/:chatId', protect, async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.find({
      chat: req.params.chatId,
      sender: req.user._id,
      status: 'pending',
    }).sort({ scheduledTime: 1 });

    res.json(scheduled);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/message/scheduled/:id
router.delete('/scheduled/:id', protect, async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.findById(req.params.id);
    if (!scheduled) {
      return res.status(404).json({ message: 'Scheduled message not found' });
    }
    if (scheduled.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    scheduled.status = 'cancelled';
    await scheduled.save();
    res.json({ message: 'Scheduled message cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/message/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.reactions = [];
    await message.save();

    const io = req.app.get('io');
    const chat = await Chat.findById(message.chat);
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message-deleted', {
        messageId: message._id,
        chatId: message.chat,
      });
    });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
