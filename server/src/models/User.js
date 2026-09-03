const mongoose = require('mongoose');

// Schema = data ka structure define karta hai (jaise table ka blueprint)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Day 6 mein hash karenge
}, { timestamps: true }); // createdAt, updatedAt auto add ho jayenge

module.exports = mongoose.model('User', userSchema);