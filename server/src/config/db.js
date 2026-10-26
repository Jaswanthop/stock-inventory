import mongoose from 'mongoose';
import { config } from './index.js';

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Retries with linear backoff so a cold Render container
 * has time to reach Atlas.
 */
export async function connectDB({ retries = 5, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      });
      console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
      return mongoose.connection;
    } catch (error) {
      console.error(`[db] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
