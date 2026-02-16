const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer config for voice uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'voice');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || '.webm')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'), false);
    }
  },
});

// POST /api/ai/smart-reply — generate smart reply suggestions
router.post('/smart-reply', protect, async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: 'chatId is required' });
    }

    // Get last 10 messages for context
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    if (messages.length === 0) {
      return res.json({ suggestions: ['Hi! 👋', 'Hello!', 'Hey there!'] });
    }

    const conversation = messages
      .reverse()
      .map((m) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a smart reply assistant. Given a chat conversation, suggest exactly 3 short, natural, contextually relevant reply options. Return ONLY a JSON array of 3 strings. Keep each reply under 50 characters. Make them casual and conversational like WhatsApp messages.',
        },
        {
          role: 'user',
          content: `Here's the recent conversation:\n\n${conversation}\n\nSuggest 3 smart replies for the current user to send next.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    let suggestions;
    try {
      const raw = completion.choices[0].message.content.trim();
      suggestions = JSON.parse(raw);
    } catch {
      suggestions = ['Sounds good! 👍', 'Got it!', 'Sure, let me check'];
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Smart reply error:', error.message);
    res.json({ suggestions: ['Okay!', 'Sounds good!', 'Let me think...'] });
  }
});

// POST /api/ai/summarize — summarize long chat
router.post('/summarize', protect, async (req, res) => {
  try {
    const { chatId, messageCount } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: 'chatId is required' });
    }

    const count = messageCount || 50;
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(count);

    if (messages.length < 3) {
      return res.json({ summary: 'Not enough messages to summarize.' });
    }

    const conversation = messages
      .reverse()
      .map((m) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a chat summarizer. Given a WhatsApp-style conversation, provide a concise, well-structured summary. Highlight key topics discussed, decisions made, action items, and important information. Format with bullet points. Keep it under 200 words.',
        },
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${conversation}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    const summary = completion.choices[0].message.content.trim();
    res.json({ summary, messageCount: messages.length });
  } catch (error) {
    console.error('Summarize error:', error.message);
    res.status(500).json({ message: 'Failed to generate summary', error: error.message });
  }
});

// POST /api/ai/voice-to-text — transcribe voice note
router.post('/voice-to-text', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      language: 'en',
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ text: transcription.text });
  } catch (error) {
    console.error('Voice-to-text error:', error.message);
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Failed to transcribe audio', error: error.message });
  }
});

module.exports = router;
