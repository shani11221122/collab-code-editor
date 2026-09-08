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
const fileRoutes = require('./src/routes/fileRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' },
});

const fileState = {};
const fileUsers = {};
const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C589E8'];
const saveTimers = {};

function reconstructContent(baseContent, operations) {
  let content = baseContent;
  for (const op of operations) {
    if (op.type === 'insert') {
      content = content.slice(0, op.pos) + op.char + content.slice(op.pos);
    } else if (op.type === 'delete') {
      content = content.slice(0, op.pos) + content.slice(op.pos + op.length);
    }
  }
  return content;
}

function scheduleSave(fileId, getCurrentContent) {
  if (saveTimers[fileId]) clearTimeout(saveTimers[fileId]);
  saveTimers[fileId] = setTimeout(async () => {
    const content = getCurrentContent();
    await File.findByIdAndUpdate(fileId, { content });
    console.log(`Auto-saved file ${fileId}`);
  }, 2000);
}

// Restore route (io chahiye isliye yahan hai, fileRoutes.js mein nahi)
app.post('/api/files/:fileId/versions/:versionId/restore', async (req, res) => {
  const file = await File.findById(req.params.fileId);
  const version = file.versions.id(req.params.versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  file.content = version.content;
  await file.save();

  if (fileState[req.params.fileId]) {
    fileState[req.params.fileId].baseContent = version.content;
    fileState[req.params.fileId].operations = [];
    fileState[req.params.fileId].revision++;
  }

  io.to(req.params.fileId).emit('file-restored', {
    content: version.content,
    revision: fileState[req.params.fileId]?.revision || 0,
  });

  res.json({ message: 'Restored', content: file.content });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-file', async (fileId, username) => {
    socket.join(fileId);
    socket.fileId = fileId;

    if (!fileState[fileId]) {
      const file = await File.findById(fileId);
      fileState[fileId] = {
        revision: 0,
        operations: [],
        baseContent: file?.content || '',
      };
    }

    const state = fileState[fileId];
    socket.emit('init-file', { content: state.baseContent, revision: state.revision });

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
    state.baseContent = reconstructContent(state.baseContent, [transformedOp]);

    socket.to(fileId).emit('remote-operation', {
      op: transformedOp,
      revision: state.revision,
    });
    socket.emit('operation-ack', { revision: state.revision });

    scheduleSave(fileId, () => state.baseContent);
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