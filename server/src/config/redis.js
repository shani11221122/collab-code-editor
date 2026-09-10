const { createClient } = require('redis');

/**
 * Sets up the two Redis clients required by the Socket.io Redis adapter.
 *
 * Why two clients?
 *   Redis pub/sub semantics forbid a single connection from both publishing
 *   *and* subscribing. The Socket.io adapter needs one dedicated publisher
 *   and one subscriber, so we duplicate the config rather than writing it twice.
 *
 * Failure behaviour:
 *   If Redis is not running (typical for local single-instance development),
 *   this throws and the caller falls back to the in-memory transport. The app
 *   remains fully functional — only horizontal multi-instance scaling is lost.
 */
async function setupRedisClients() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  console.log('[redis] clients connected');
  return { pubClient, subClient };
}

module.exports = setupRedisClients;