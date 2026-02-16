/*
 * OTP Provider Abstraction
 * Supports: 'console' (dev), 'twilio'
 * Set OTP_PROVIDER in .env to switch providers
 */

async function sendOtp(phone, otp) {
  const provider = process.env.OTP_PROVIDER || 'console';

  switch (provider) {
    case 'twilio':
      return sendViaTwilio(phone, otp);
    case 'console':
    default:
      return sendViaConsole(phone, otp);
  }
}

// Development — log OTP to console
async function sendViaConsole(phone, otp) {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`📱 OTP for ${phone}: ${otp}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  return { success: true, provider: 'console' };
}

// Twilio SMS provider
async function sendViaTwilio(phone, otp) {
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your WhatsApp Clone verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });

    return { success: true, provider: 'twilio' };
  } catch (error) {
    console.error('Twilio error:', error.message);
    throw new Error('Failed to send OTP via SMS');
  }
}

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { sendOtp, generateOtp };
