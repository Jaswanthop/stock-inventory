import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { ensureAdmin, seedDemoData } from './utils/seed.js';

async function start() {
  await connectDB();

  await ensureAdmin();
  if (config.seedDemoData) {
    await seedDemoData();
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[api] StockPilot listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received — shutting down`);
    server.close(async () => {
      const { disconnectDB } = await import('./config/db.js');
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[api] Unhandled rejection:', reason);
});

start().catch((error) => {
  console.error('[api] Failed to start:', error.message);
  process.exit(1);
});
