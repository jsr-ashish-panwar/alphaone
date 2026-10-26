import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { seedDatabaseIfEmpty } from './seed.js';

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed demo data if flat database has 0 flats
    await seedDatabaseIfEmpty();

    const app = createApp();
    const server = app.listen(ENV.PORT, () => {
      console.log(`🚀 RoomMate Split server running on http://localhost:${ENV.PORT}`);
      console.log(`📡 Health endpoint: http://localhost:${ENV.PORT}/api/health`);
    });

    const shutdown = async () => {
      console.log('\n🛑 Gracefully shutting down server...');
      server.close(async () => {
        await disconnectDB();
        console.log('✅ Server and database disconnected cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
