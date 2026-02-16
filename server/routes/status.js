const express = require('express');
const Status = require('../models/Status');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/status — create a new status
router.post('/', protect, async (req, res) => {
  try {
    const { type, content, mediaUrl, backgroundColor } = req.body;

    if (!type || (!content && !mediaUrl)) {
      return res.status(400).json({ message: 'Status content or media is required' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const status = await Status.create({
      user: req.user._id,
      type,
      content: content || '',
      mediaUrl: mediaUrl || '',
      backgroundColor: backgroundColor || '#00a884',
      expiresAt,
    });

    await status.populate('user', 'name avatar phone');

    // Broadcast to all connected users
    const io = req.app.get('io');
    io.emit('new-status', status);

    res.status(201).json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/status — get all contacts' statuses (not expired)
router.get('/', protect, async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name avatar phone')
      .populate('seenBy.user', 'name avatar')
      .sort({ createdAt: -1 });

    // Group statuses by user
    const grouped = {};
    statuses.forEach((status) => {
      const userId = status.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: status.user,
          statuses: [],
          hasUnseen: false,
        };
      }
      grouped[userId].statuses.push(status);
      // Check if current user has seen this status
      const seen = status.seenBy.some(
        (s) => s.user._id.toString() === req.user._id.toString()
      );
      if (!seen && userId !== req.user._id.toString()) {
        grouped[userId].hasUnseen = true;
      }
    });

    // Separate my statuses from others
    const myId = req.user._id.toString();
    const myStatuses = grouped[myId] || { user: req.user, statuses: [], hasUnseen: false };
    delete grouped[myId];

    res.json({
      myStatuses,
      contactStatuses: Object.values(grouped),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/status/seen/:id — mark a status as seen
router.put('/seen/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Don't add duplicate seen entries
    const already = status.seenBy.some(
      (s) => s.user.toString() === req.user._id.toString()
    );
    if (!already) {
      status.seenBy.push({ user: req.user._id });
      await status.save();
    }

    res.json({ message: 'Status marked as seen' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/status/:id — delete own status
router.delete('/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }
    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Status.findByIdAndDelete(req.params.id);
    res.json({ message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
