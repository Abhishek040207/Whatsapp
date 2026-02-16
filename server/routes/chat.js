const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/chat — access or create a 1-on-1 chat
router.post('/', protect, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate('participants', '-__v')
      .populate('lastMessage');

    if (chat) {
      if (chat.lastMessage) {
        chat = await chat.populate('lastMessage.sender', 'name avatar');
      }
      return res.json(chat);
    }

    // Create new chat
    const newChat = await Chat.create({
      participants: [req.user._id, userId],
      isGroup: false,
    });

    const fullChat = await Chat.findById(newChat._id).populate('participants', '-__v');

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/chat — get all chats for current user
router.get('/', protect, async (req, res) => {
  try {
    let chats = await Chat.find({
      participants: req.user._id,
    })
      .populate('participants', '-__v')
      .populate('lastMessage')
      .populate('admin', 'name avatar')
      .sort({ updatedAt: -1 });

    chats = await Chat.populate(chats, {
      path: 'lastMessage.sender',
      select: 'name avatar',
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/chat/group — create group chat
router.post('/group', protect, async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants || participants.length < 2) {
      return res.status(400).json({
        message: 'Group name and at least 2 other participants are required',
      });
    }

    const allParticipants = [...participants, req.user._id.toString()];

    const groupChat = await Chat.create({
      participants: allParticipants,
      isGroup: true,
      groupName: name,
      admin: req.user._id,
    });

    const fullChat = await Chat.findById(groupChat._id)
      .populate('participants', '-__v')
      .populate('admin', 'name avatar');

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/chat/group/:id — update group
router.put('/group/:id', protect, async (req, res) => {
  try {
    const { groupName, addUser, removeUser } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    if (groupName) chat.groupName = groupName;
    if (addUser) chat.participants.push(addUser);
    if (removeUser) {
      chat.participants = chat.participants.filter(
        (p) => p.toString() !== removeUser
      );
    }

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants', '-__v')
      .populate('admin', 'name avatar');

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
