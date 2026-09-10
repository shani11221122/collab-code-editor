const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const connectDB = require('./src/config/db');
const setupRedisClients = require('./src/config/redis');
const { transform } = require('./src/ot');
const File = require('./src/models/File');
const authRoutes = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const executeRoutes = require('./src/routes/executeRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/execute', executeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
});

/**
 * Redis adapter — forwards Socket.io events through Redis pub/sub so that
 * multiple server instances can talk to each other (horizontal scaling).
 * If Redis is not running we degrade gracefully to single-instance mode;
 * the application code below is identical in both cases.
 */
async function initRedisAdapter() {
  try {
    const { pubClient, subClient } = await setupRedisClients();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[redis] Socket.io using Redis adapter (multi-instance ready)');
  } catch (error) {
    console.log('[redis] Not available — running single-instance mode:', error.message);
  }
}
initRedisAdapter();

/**
 * In-memory collaboration state.
 * NOTE: per-server-instance. The Redis adapter syncs Socket.io *events*, not
 * this application data. Moving fileState/fileUsers into Redis is the natural
 * next step for true multi-instance production deployments (see PROJECT_GUIDE).
 */
const fileState = {};
const fileUsers = {};
const colors = ['#f43f5e', '#10b981', '#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185'];
const saveTimers = {};
const pendingDisconnects = {};

const DISCONNECT_GRACE_MS = 3000; // ignore sub-second network blips
const SAVE_DEBOUNCE_MS = 2000;

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
    delete saveTimers[fileId];
    try {
      const content = getCurrentContent();
      await File.findByIdAndUpdate(fileId, { content });
      console.log(`Auto-saved file ${fileId}`);
    } catch (error) {
      console.error(`Auto-save failed for ${fileId}:`, error.message);
    }
  }, SAVE_DEBOUNCE_MS);
}

function usersOf(fileId) {
  return Object.values(fileUsers[fileId] || {});
}

function broadcastUsers(fileId) {
  io.to(fileId).emit('users-update', usersOf(fileId));
}

// Restore route (needs io, so it lives here rather than fileRoutes.js)
app.post('/api/files/:fileId/versions/:versionId/restore', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-file', async (fileId, username) => {
    socket.join(fileId);
    socket.fileId = fileId;

    if (!fileState[fileId]) {
      let file = null;
      try {
        file = await File.findById(fileId);
      } catch (error) {
        // Invalid/unknown file id — nothing to seed, treat as empty doc.
      }
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
    broadcastUsers(fileId);
  });

  socket.on('leave-file', (fileId) => {
    socket.leave(fileId);
    if (fileUsers[fileId]) {
      delete fileUsers[fileId][socket.id];
      broadcastUsers(fileId);
    }
  });

  socket.on('operation', ({ fileId, op, revision }) => {
    const state = fileState[fileId];
    if (!state || !op || typeof revision !== 'number') return;

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

  socket.on('chat-message', ({ fileId, message, username }) => {
    if (!fileId || !message || !message.trim()) return;
    io.to(fileId).emit('chat-message', {
      username: username || 'Guest',
      message: message.trim(),
      at: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const fileId = socket.fileId;

    // Grace period: a quick network blip triggers a reconnection where the
    // client re-joins the file under a *new* socket id. Deleting the user
    // instantly would cause a visible "left then returned" flicker in the UI.
    pendingDisconnects[socket.id] = setTimeout(() => {
      if (fileId && fileUsers[fileId]?.[socket.id]) {
        delete fileUsers[fileId][socket.id];
        broadcastUsers(fileId);
      }
      delete pendingDisconnects[socket.id];
    }, DISCONNECT_GRACE_MS);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});