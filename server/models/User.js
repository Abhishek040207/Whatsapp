const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    // Keep email for backward compatibility with existing data
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Hey there! I am using WhatsApp.',
      maxlength: 140,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
