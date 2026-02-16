// In-memory rate limiter for OTP requests
// Key: phone number, Value: { count, resetTime }
const otpLimits = new Map();

const OTP_MAX_REQUESTS = 5;
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function rateLimitOtp(req, res, next) {
  const phone = req.body.phone;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const now = Date.now();
  const existing = otpLimits.get(phone);

  if (existing) {
    // Reset window expired
    if (now > existing.resetTime) {
      otpLimits.set(phone, { count: 1, resetTime: now + OTP_WINDOW_MS });
      return next();
    }

    if (existing.count >= OTP_MAX_REQUESTS) {
      const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
      return res.status(429).json({
        message: 'Too many OTP requests. Please try again later.',
        retryAfterSeconds: retryAfter,
      });
    }

    existing.count++;
    otpLimits.set(phone, existing);
  } else {
    otpLimits.set(phone, { count: 1, resetTime: now + OTP_WINDOW_MS });
  }

  next();
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of otpLimits.entries()) {
    if (now > data.resetTime) {
      otpLimits.delete(phone);
    }
  }
}, 30 * 60 * 1000);

module.exports = { rateLimitOtp };
