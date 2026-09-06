const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },        // e.g. "index.js"
  language: { type: String, default: 'javascript' },
  content: { type: String, default: '' },
  roomId: { type: String, required: true },       // konse room ki file hai
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);