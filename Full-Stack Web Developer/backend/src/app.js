import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

/**
 * Membuat instance Express app. Dipisah dari server agar mudah di-test
 * (supertest mengimpor app tanpa harus listen ke port).
 */
export function createApp() {
  const app = express();

  // Keamanan dasar header HTTP.
  app.use(helmet());

 // CORS: izinkan request same-origin (deploy fullstack: frontend & backend di
  // domain yang sama) + origin yang terdaftar via CORS_ALLOW_ORIGINS.
  // Memakai bentuk "delegate" cors agar bisa membaca req.headers.host.
  app.use(
    cors((req, cb) => {
      const origin = req.headers.origin;
      // Tools tanpa origin (curl/Postman/health check) selalu diizinkan.
      if (!origin) return cb(null, { origin: true });
      // Origin yang terdaftar eksplisit.
      if (config.corsOrigins.includes(origin)) return cb(null, { origin: true });
      // Same-origin: host pada header Origin sama dengan host request.
      // Saat fullstack di Vercel, frontend memanggil /api di domain yang sama,
      // jadi ini menutup kasus tanpa perlu mengeset CORS_ALLOW_ORIGINS.
      try {
        if (new URL(origin).host === req.headers.host) {
          return cb(null, { origin: true });
        }
      } catch {
        /* origin bukan URL valid — lanjut tolak */
      }
      logger.warn(`Origin ditolak oleh CORS: ${origin}`);
      return cb(null, { origin: false });
    })
  );

  // Body parser JSON (untuk endpoint non-multipart bila ada).
  app.use(express.json({ limit: '1mb' }));

  // Logging request ringan.
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  // Root info.
  app.get('/', (_req, res) => {
    res.json({
      service: 'Foreca Backend (BFF)',
      version: '1.0.0',
      endpoints: ['/api/health', '/api/model-info', '/api/inspect', '/api/analyze', '/api/history'],
    });
  });

  // API.
  app.use('/api', apiRouter);

  // 404 + error handler (harus paling akhir).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
