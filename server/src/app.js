import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import movementRoutes from './routes/movements.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The SPA and API are same-origin; CSP is disabled to keep Render previews
      // and local tooling from blocking Vite's injected runtime.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(
    cors({
      // Same-origin by default (Express serves the SPA). Set CORS_ORIGIN only
      // when hosting the React app on a different domain.
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim()) : false,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (config.env !== 'test') {
    app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  }

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { message: 'Too many requests. Please slow down and try again shortly.' },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'stockpilot-api',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: Number(process.uptime().toFixed(1)),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/movements', movementRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', userRoutes);

  // Serve the compiled React app when it exists (production / Render).
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist, { maxAge: config.isProduction ? '1d' : 0, index: false }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      return res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.status(200).json({
        message: 'StockPilot API is running. Build the client (npm run build) to serve the web app.',
        docs: '/api/health',
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
