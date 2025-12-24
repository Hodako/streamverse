import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  process.stdout.write(`Backend listening on http://localhost:${env.PORT}\n`);
});

server.on('error', (err: any) => {
  if (err?.code === 'EADDRINUSE') {
    process.stderr.write(`Port ${env.PORT} is already in use. Stop the other server or change PORT in .env.\n`);
    process.exit(1);
  }
  process.stderr.write(`Server error: ${String(err?.message || err)}\n`);
  process.exit(1);
});
