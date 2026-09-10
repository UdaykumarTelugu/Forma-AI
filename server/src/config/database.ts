import mongoose from 'mongoose';
import { ENV } from './env';

/**
 * Sanitizes MongoDB connection URI for safe logging (hiding credentials if present)
 */
const sanitizeMongoUri = (uri: string): string => {
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
  } catch {
    return '[Protected Mongo URI]';
  }
};

/**
 * Checks if the MongoDB database is currently connected
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Connects to MongoDB database using Mongoose
 */
export const connectDatabase = async (): Promise<void> => {
  const safeUri = sanitizeMongoUri(ENV.MONGODB_URI);

  // Setup connection event listeners
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error event:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database.');
  });

  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB] Connected successfully to ${safeUri}`);
  } catch (error) {
    console.error(`[MongoDB] Failed to connect to ${safeUri}:`, error instanceof Error ? error.message : error);
    throw error;
  }
};

/**
 * Disconnects from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected cleanly.');
  }
};
