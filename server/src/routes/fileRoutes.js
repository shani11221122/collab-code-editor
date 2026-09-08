const express = require('express');
const File = require('../models/File');

const router = express.Router();

router.post('/:fileId/versions', async (req, res) => {
  const file = await File.findById(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  file.versions.push({ content: file.content });
  await file.save();
  res.status(201).json({ message: 'Version saved', versions: file.versions });
});

router.get('/:fileId/versions', async (req, res) => {
  const file = await File.findById(req.params.fileId);
  res.json(file?.versions || []);
});

module.exports = router;