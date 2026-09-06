import { io } from 'socket.io-client';

// Ek hi socket connection poori app mein reuse hoga
const socket = io('http://localhost:5000');

export default socket;