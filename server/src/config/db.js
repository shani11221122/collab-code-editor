const mongoose = require('mongoose');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Connects to MongoDB.
 *
 * Production note: on hosted platforms (Render, etc.) there is no local
 * MongoDB — MONGO_URI MUST point to a reachable cluster (MongoDB Atlas).
 * We retry a few times and bail with an actionable message so a broken
 * MONGO_URI surfaces as a clear boot failure instead of random 500s.
 */
const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // serverSelectionTimeoutMS limits how long an unreachable host is waited on
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('MongoDB Connected');
      return;
    } catch (error) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  console.error(
    '\nFATAL: could not connect to MongoDB.\n' +
      'Set the MONGO_URI environment variable to a reachable cluster, e.g.:\n' +
      '  mongodb+srv://<user>:<password>@<cluster>.mongodb.net/collab-editor?retryWrites=true&w=majority\n'
  );
  process.exit(1);
};

module.exports = connectDB;