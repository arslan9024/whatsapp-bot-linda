import net from 'node:net';
import { createHash } from 'node:crypto';
import path from 'node:path';

// The OS releases this loopback reservation even after a crash; no stale lock deletion is needed.
export async function acquireBotInstance(projectRoot) {
  const identity = path.resolve(projectRoot);
  const normalized = process.platform === 'win32' ? identity.toLowerCase() : identity;
  const digest = createHash('sha256').update(normalized).digest();
  const port = 49152 + digest.readUInt16BE(0) % 16384;
  const server = net.createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => {
    const onError = error => reject(new Error(
      `Cannot reserve bot ownership on 127.0.0.1:${port}. Another bot instance or local application owns it; no browsers were changed. ${error.message}`,
      { cause: error }
    ));
    server.once('error', onError);
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.removeListener('error', onError);
      resolve();
    });
  });
  server.unref();
  return {
    port,
    release: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}
