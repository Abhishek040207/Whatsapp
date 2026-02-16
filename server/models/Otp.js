const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL — MongoDB auto-deletes expired docs
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash an OTP code
otpSchema.statics.hashOtp = function (otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP against hash
otpSchema.methods.verifyOtp = function (otp) {
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return this.otpHash === hash;
};

module.exports = mongoose.model('Otp', otpSchema);
