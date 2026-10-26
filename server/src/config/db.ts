import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongod: any = null;

export const connectDB = async (customUri?: string): Promise<string> => {
  try {
    let uri = customUri || process.env.MONGODB_URI || ENV.MONGODB_URI;

    if (!uri || uri === 'memory') {
      if (!mongod) {
        console.log('⚡ Initializing embedded in-memory MongoDB server...');
        // @ts-ignore
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'alpha_c42_split',
          },
        });
      }
      uri = mongod.getUri();
      console.log(`✅ In-memory MongoDB ready: ${uri}`);
    }

    mongoose.set('strictQuery', true);
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,
      });
    }

    console.log(`📦 MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return uri;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);

    // If memory server stopped, recreate it
    if ((!ENV.MONGODB_URI || ENV.MONGODB_URI === 'memory') && mongod) {
      try {
        console.log('🔄 Recreating in-memory MongoDB instance...');
        mongod = null;
        return await connectDB();
      } catch (retryErr) {
        console.error('Failed to recover in-memory MongoDB:', retryErr);
      }
    }
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  } catch (error) {
    console.error('Error disconnecting MongoDB:', error);
  }
};
