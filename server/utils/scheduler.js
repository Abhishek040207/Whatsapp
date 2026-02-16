const schedule = require('node-schedule');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const ScheduledMessage = require('../models/ScheduledMessage');

const scheduledJobs = new Map();

// Schedule a single message for future delivery
function scheduleMessage(scheduledMsg, io) {
  const job = schedule.scheduleJob(scheduledMsg.scheduledTime, async () => {
    try {
      // Create the actual message
      let message = await Message.create({
        sender: scheduledMsg.sender,
        chat: scheduledMsg.chat,
        content: scheduledMsg.content,
        type: 'text',
        readBy: [scheduledMsg.sender],
      });

      // Update chat's lastMessage
      await Chat.findByIdAndUpdate(scheduledMsg.chat, {
        lastMessage: message._id,
      });

      // Mark scheduled message as sent
      scheduledMsg.status = 'sent';
      await scheduledMsg.save();

      // Populate and emit via socket
      message = await message.populate('sender', 'name avatar');
      message = await message.populate({
        path: 'chat',
        populate: { path: 'participants', select: 'name avatar email' },
      });

      const chat = await Chat.findById(scheduledMsg.chat);
      chat.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit('new-message', message);
      });

      // Notify sender that scheduled message was sent
      io.to(scheduledMsg.sender.toString()).emit('scheduled-message-sent', {
        scheduledId: scheduledMsg._id,
        message,
      });

      console.log(`📬 Scheduled message ${scheduledMsg._id} sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send scheduled message ${scheduledMsg._id}:`, error.message);
      scheduledMsg.status = 'failed';
      await scheduledMsg.save();
    }

    // Clean up job reference
    scheduledJobs.delete(scheduledMsg._id.toString());
  });

  if (job) {
    scheduledJobs.set(scheduledMsg._id.toString(), job);
  }
}

// Initialize scheduler — load pending messages on server start
async function initScheduler(io) {
  try {
    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      scheduledTime: { $gt: new Date() },
    });

    pendingMessages.forEach((msg) => scheduleMessage(msg, io));
    console.log(`⏰ Scheduler initialized with ${pendingMessages.length} pending messages`);
  } catch (error) {
    console.error('Scheduler init error:', error.message);
  }
}

module.exports = { scheduleMessage, initScheduler };
