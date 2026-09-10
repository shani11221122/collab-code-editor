/**
 * E2E socket test: two clients, presence, OT ops, chat relay, rejoin.
 * Run with: node scripts/socket-e2e-test.cjs   (from the client/ folder)
 * Requires: server running on http://localhost:5000 + a new room created.
 */
const { io } = require('socket.io-client');

const URL = 'http://localhost:5000';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, ev) => new Promise((r) => s.once(ev, r));

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

(async () => {
  // Fresh room + default file so assertions are deterministic.
  const roomRes = await fetch(URL + '/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Socket Test' }),
  });
  const files = await (await fetch(URL + '/api/rooms/' + (await roomRes.json()).roomId + '/files')).json();
  const FILE = files[0]._id;
  const BASE = files[0].content;

  const a = io(URL, { transports: ['websocket'], reconnection: false });
  const b = io(URL, { transports: ['websocket'], reconnection: false });

  await Promise.all([once(a, 'connect'), once(b, 'connect')]);
  console.log('PASS: both clients connected');

  // --- join-file: both clients join the same file (subscribe FIRST) ---
  let users = [];
  a.on('users-update', (u) => { users = u; });

  const bInit = once(b, 'init-file');
  a.emit('join-file', FILE, 'Alice');
  b.emit('join-file', FILE, 'Bob');
  const init = await bInit;
  if (init.content !== BASE) fail('unexpected init content: ' + init.content);
  console.log('PASS: init-file received, content matches DB');

  // --- presence: users-update should list both users ---
  await sleep(500);
  if (users.length !== 2) fail('expected 2 users, got ' + JSON.stringify(users.map((u) => u.username)));
  console.log('PASS: presence shows 2 users (' + users.map((u) => u.username).join(' + ') + ')');

  // persistent ack tracker
  let ackRev = 0;
  a.on('operation-ack', ({ revision }) => { ackRev = Math.max(ackRev, revision); });
  const waitAck = async (target) => {
    for (let i = 0; i < 20; i++) {
      if (ackRev >= target) return;
      await sleep(100);
    }
    fail('ack never reached revision ' + target + ' (at ' + ackRev + ')');
  };

  // --- OT: A inserts 'X' at pos 6 (revision 0) ---
  const bRemote = once(b, 'remote-operation');
  a.emit('operation', { fileId: FILE, op: { type: 'insert', pos: 6, char: 'X' }, revision: 0 });
  const r1 = await bRemote;
  if (r1.op.char !== 'X' || r1.revision !== 1) fail('bad remote-op r1: ' + JSON.stringify(r1));
  console.log('PASS: operation broadcast to peer, revision=1');

  // A emits another op with stale revision 0 → gets transformed + acked at rev 2
  a.emit('operation', { fileId: FILE, op: { type: 'insert', pos: 7, char: 'Z' }, revision: 0 });
  await waitAck(2);
  console.log('PASS: stale-revision op transformed, ack revision=2');

  // --- chat relay ---
  const bChat = once(b, 'chat-message');
  a.emit('chat-message', { fileId: FILE, message: 'hello team', username: 'Alice' });
  const msg = await bChat;
  if (msg.message !== 'hello team' || msg.username !== 'Alice') fail('bad chat: ' + JSON.stringify(msg));
  console.log('PASS: chat-message relayed to peer');

  // --- reconnect semantics: same socket re-joins, still works ---
  a.emit('join-file', FILE, 'Alice');
  await sleep(400);
  a.emit('operation', { fileId: FILE, op: { type: 'insert', pos: 0, char: '>' }, revision: 2 });
  await Promise.race([
    once(b, 'remote-operation').then((r) => console.log('PASS: re-joined socket still broadcasts (revision ' + r.revision + ')')),
    sleep(1500).then(() => fail('re-join op not delivered to peer')),
  ]);

  console.log('\nALL SOCKET TESTS PASSED');
  a.disconnect();
  b.disconnect();
  process.exit(0);
})().catch((e) => fail(e.message));