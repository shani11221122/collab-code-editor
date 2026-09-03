const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 1. mongoose.connect() DB se connection establish karta hai
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    // 2. Agar connection fail ho to error dikhayein aur process band kar dein
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;