import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repository root (works in dev and on Render).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // also allow a server/.env or cwd .env

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

export const config = {
  env: NODE_ENV,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockpilot',
  jwtSecret: process.env.JWT_SECRET || 'stockpilot-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientDist: path.resolve(__dirname, '../../../client/dist'),
  admin: {
    name: process.env.ADMIN_NAME || 'Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@stockpilot.dev').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
  seedDemoData: String(process.env.SEED_DEMO_DATA || '').toLowerCase() === 'true',
};

if (isProduction && !process.env.JWT_SECRET) {
  console.warn('[config] WARNING: JWT_SECRET is not set. Using an insecure fallback secret.');
}
