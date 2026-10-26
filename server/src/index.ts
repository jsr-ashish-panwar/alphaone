import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { seedDatabaseIfEmpty } from './seed.js';

const startServer = async () => {
  try {
    const app = createApp();
    const port = Number(ENV.PORT) || 5000;

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 RoomMate Split server running on port ${port}`);
      console.log(`📡 Health endpoint: /api/health`);
    });

    try {
      await connectDB();
      // Auto-seed demo data if flat database has 0 flats
      await seedDatabaseIfEmpty();
    } catch (dbError) {
      console.error('⚠️ Initial database connection error:', dbError);
    }

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
