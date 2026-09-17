import net from 'node:net';

const primaryPort = parseInt(process.env.PORT || '4321', 10);
const altPort = primaryPort === 4321 ? 3000 : 4321;

// Ensure HOST is set to 0.0.0.0 for Docker networking
process.env.HOST = '0.0.0.0';

// Import and start Astro production server
import('./dist/server/entry.mjs')
  .then(() => {
    console.log(`[Server] Astro server initialized on port ${primaryPort}`);

    // Set up transparent dual-port forwarder (allows both 4321 and 3000 to work in Dokploy/Traefik)
    try {
      const proxy = net.createServer((socket) => {
        const client = net.connect(primaryPort, '127.0.0.1');
        socket.pipe(client).pipe(socket);
        client.on('error', () => socket.destroy());
        socket.on('error', () => client.destroy());
      });

      proxy.on('error', (err) => {
        // Non-fatal if port is already in use
        console.log(`[Server] Dual-port forwarder notice for ${altPort}: ${err.message}`);
      });

      proxy.listen(altPort, '0.0.0.0', () => {
        console.log(`[Server] Dual-port compatibility active on 0.0.0.0:${altPort} -> :${primaryPort}`);
      });
    } catch (e) {
      // Ignore
    }
  })
  .catch((err) => {
    console.error('[Server] Fatal error starting server:', err);
    process.exit(1);
  });
