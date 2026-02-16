const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    backgroundColor: {
      type: String,
      default: '#00a884',
    },
    seenBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seenAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL auto-delete
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Status', statusSchema);
