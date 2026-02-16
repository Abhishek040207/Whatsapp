const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { protect } = require('../middleware/auth');
const { rateLimitOtp } = require('../middleware/rateLimit');
const { sendOtp, generateOtp } = require('../utils/otpProvider');

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/send-otp
router.post('/send-otp', rateLimitOtp, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length < 10) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    // Delete any existing OTPs for this phone
    await Otp.deleteMany({ phone });

    // Generate and hash OTP
    const otp = generateOtp();
    const otpHash = Otp.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({ phone, otpHash, expiresAt });

    // Send OTP via configured provider
    await sendOtp(phone, otp);

    res.json({
      message: 'OTP sent successfully',
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    // Find valid OTP
    const otpRecord = await Otp.findOne({
      phone,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      await Otp.deleteMany({ phone });
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (!otpRecord.verifyOtp(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        message: 'Invalid OTP',
        attemptsRemaining: 5 - otpRecord.attempts,
      });
    }

    // OTP verified — delete all OTPs for this phone
    await Otp.deleteMany({ phone });

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({ phone });
      isNewUser = true;
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      _id: user._id,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      about: user.about,
      isProfileComplete: user.isProfileComplete,
      isNewUser,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', rateLimitOtp, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Delete existing OTPs
    await Otp.deleteMany({ phone });

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = Otp.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.create({ phone, otpHash, expiresAt });
    await sendOtp(phone, otp);

    res.json({ message: 'OTP resent successfully', expiresInSeconds: 300 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users — search users
router.get('/users', protect, async (req, res) => {
  try {
    const search = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { phone: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find({
      ...search,
      _id: { $ne: req.user._id },
      isProfileComplete: true,
    }).select('-__v');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/auth/profile — update/setup profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, about, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (about !== undefined) user.about = about;
    if (avatar !== undefined) user.avatar = avatar;

    // Mark profile as complete if name is set
    if (user.name && user.name.length >= 2) {
      user.isProfileComplete = true;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
