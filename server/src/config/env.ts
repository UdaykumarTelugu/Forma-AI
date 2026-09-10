import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/forma_ai',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || undefined,
};
