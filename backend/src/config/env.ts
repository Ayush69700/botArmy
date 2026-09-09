import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  googleCloudCredentialsPath: process.env.GOOGLE_CLOUD_CREDENTIALS_PATH
    ? path.resolve(process.env.GOOGLE_CLOUD_CREDENTIALS_PATH)
    : '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'companion_secret_dev_key_12345',
};
