import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

/**
 * Single shared Socket.io connection for the whole app.
 *
 * Auto-reconnect: if the network blips, the client retries up to 5 times and
 * the Editor re-joins the current file on every successful (re)connect so the
 * latest content and revision are re-synced from the server.
 */
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;