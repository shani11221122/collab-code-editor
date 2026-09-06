const express = require('express');
const { nanoid } = require('nanoid');
const Room = require('../models/Room');
const File = require('../models/File');

const router = express.Router();

// 1. Naya room banao
router.post('/', async (req, res) => {
  try {
    const roomId = nanoid(8); // e.g. "aX9kLp2Q" — short unique ID
    const room = await Room.create({ roomId, name: req.body.name || 'Untitled Project' });

    // 2. Har naye room ke sath ek default file bhi bana dein
    await File.create({ name: 'index.js', roomId, content: '// Start coding...' });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Ek room ki details lao (check karne ke liye ke wo exist karta hai)
router.get('/:roomId', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.roomId });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// 4. Room ke andar sab files ki list lao
router.get('/:roomId/files', async (req, res) => {
  const files = await File.find({ roomId: req.params.roomId });
  res.json(files);
});

// 5. Room mein nayi file add karo
router.post('/:roomId/files', async (req, res) => {
  const { name, language } = req.body;
  const file = await File.create({ name, language, roomId: req.params.roomId });
  res.status(201).json(file);
});

module.exports = router;