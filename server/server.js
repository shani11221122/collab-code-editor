const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const { transform } = require('./src/ot');
const File = require('./src/models/File');
const authRoutes = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', time: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' },
});

// In-memory state (Day 7 mein DB persistence add karenge)
const fileState = {};   // fileState[fileId] = { revision: 0, operations: [] }
const fileUsers = {};   // fileUsers[fileId] = { socketId: { username, color } }
const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C589E8'];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-file', async (fileId, username) => {
    socket.join(fileId);
    socket.fileId = fileId; // disconnect ke waqt use karne ke liye yaad rakho

    if (!fileState[fileId]) {
      fileState[fileId] = { revision: 0, operations: [] };
    }

    // Current saved content bhejo taake naya joiner sync ho sake
    const file = await File.findById(fileId);
    socket.emit('init-file', {
      content: file?.content || '',
      revision: fileState[fileId].revision,
    });

    // Presence: is user ko color assign karo, sab ko updated list bhejo
    if (!fileUsers[fileId]) fileUsers[fileId] = {};
    const color = colors[Object.keys(fileUsers[fileId]).length % colors.length];
    fileUsers[fileId][socket.id] = { username: username || 'Guest', color };

    io.to(fileId).emit('users-update', Object.values(fileUsers[fileId]));
  });

  socket.on('leave-file', (fileId) => {
    socket.leave(fileId);
  });

  socket.on('operation', ({ fileId, op, revision }) => {
    const state = fileState[fileId];
    if (!state) return;

    let transformedOp = op;
    const missedOps = state.operations.slice(revision);
    for (const missedOp of missedOps) {
      transformedOp = transform(transformedOp, missedOp);
    }

    state.operations.push(transformedOp);
    state.revision++;

    socket.to(fileId).emit('remote-operation', {
      op: transformedOp,
      revision: state.revision,
    });
    socket.emit('operation-ack', { revision: state.revision });
  });

  socket.on('cursor-move', ({ fileId, position }) => {
    const user = fileUsers[fileId]?.[socket.id];
    if (!user) return;
    socket.to(fileId).emit('remote-cursor', {
      socketId: socket.id,
      position,
      username: user.username,
      color: user.color,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const fileId = socket.fileId;
    if (fileId && fileUsers[fileId]) {
      delete fileUsers[fileId][socket.id];
      io.to(fileId).emit('users-update', Object.values(fileUsers[fileId]));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});