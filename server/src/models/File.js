const mongoose = require('mongoose');

// Ek chhota schema sirf history ke snapshots ke liye
const versionSchema = new mongoose.Schema({
  content: String,
  savedAt: { type: Date, default: Date.now },
}, { _id: true }); // har version ki apni ID hogi (restore ke liye)

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  content: { type: String, default: '' },
  roomId: { type: String, required: true },
  versions: [versionSchema], // 1. array of snapshots
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);