const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();


connectDB();

const app = express();

app.use(cors());          
app.use(express.json());  


app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', time: new Date() });
  console.log('Health check endpoint hit at', new Date());
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});