const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');           // NEW
const { Server } = require('socket.io'); // NEW
const connectDB = require('./src/config/db');
const { transform } = require('./src/ot');
const roomRoutes = require('./src/routes/roomRoutes');
const File = require('./src/models/File'); // top pe add karein




dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rooms', roomRoutes);
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
const fileState = {}; // fileState[fileId] = { revision: 0, operations: [] }

io.on('connection', (socket) => {
  // Ab client "fileId" ke sath join karega, poore room ke sath nahi
  socket.on('join-file', async (fileId) => {
    socket.join(fileId);
    if (!fileState[fileId]) {
      fileState[fileId] = { revision: 0, operations: [] };
    }

    // Current saved content bhej do taake naya joiner sync ho sake
    const file = await File.findById(fileId);
    socket.emit('init-file', {
      content: file?.content || '',
      revision: fileState[fileId].revision,
    });
  });

  socket.on('leave-file', (fileId) => {
    socket.leave(fileId); // jab user doosri file pe switch kare
  });

  socket.on('operation', ({ fileId, op, revision }) => {
    const state = fileState[fileId];
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
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {  // note: app.listen nahi, server.listen
  console.log(`Server running on port ${PORT}`);
});