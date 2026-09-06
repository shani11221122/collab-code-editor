const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');           // NEW
const { Server } = require('socket.io'); // NEW
const connectDB = require('./src/config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// 1. Express app ko ek raw HTTP server mein wrap karna zaroori hai
//    kyunke Socket.io ko HTTP server ke sath directly attach hona padta hai
const server = http.createServer(app);

// 2. Socket.io ko us server ke sath jodo
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' }, // sirf frontend se connection allow karo
});

// 3. Jab bhi koi naya client connect ho, ye function chalega
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 4. Client ne "join-room" event bheja (roomId ke sath)
  socket.on('join-room', (roomId) => {
    socket.join(roomId); // is socket ko us room mein daal do
    console.log(`${socket.id} joined room ${roomId}`);
  });

  // 5. Client ne code change bheja
  socket.on('code-change', ({ roomId, code }) => {
    // is socket ke ilawa room ke baaki sab members ko bhejo
    socket.to(roomId).emit('receive-code-change', code);
  });

  // 6. Client disconnect ho gaya
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {  // note: app.listen nahi, server.listen
  console.log(`Server running on port ${PORT}`);
});