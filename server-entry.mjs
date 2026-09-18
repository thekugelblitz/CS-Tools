import net from 'node:net';

const primaryPort = parseInt(process.env.PORT || '4321', 10);
const forwardPorts = [4321, 3000, 8080].filter(p => p !== primaryPort);

// Ensure HOST is set to 0.0.0.0 for Docker networking
process.env.HOST = '0.0.0.0';

// Import and start Astro production server
import('./dist/server/entry.mjs')
  .then(() => {
    console.log(`[Server] CS2Live Astro server initialized on primary port ${primaryPort}`);

    // Set up transparent multi-port forwarders (allows 4321, 3000, and 8080 in Dokploy/Traefik)
    forwardPorts.forEach((altPort) => {
      try {
        const proxy = net.createServer((socket) => {
          const client = net.connect(primaryPort, '127.0.0.1');
          socket.pipe(client).pipe(socket);
          client.on('error', () => socket.destroy());
          socket.on('error', () => client.destroy());
        });

        proxy.on('error', (err) => {
          console.log(`[Server] Port forwarder notice for :${altPort}: ${err.message}`);
        });

        proxy.listen(altPort, '0.0.0.0', () => {
          console.log(`[Server] Multi-port ingress active on 0.0.0.0:${altPort} -> :${primaryPort}`);
        });
      } catch (e) {
        // Ignore non-fatal binding errors
      }
    });
  })
  .catch((err) => {
    console.error('[Server] Fatal error starting server:', err);
    process.exit(1);
  });
