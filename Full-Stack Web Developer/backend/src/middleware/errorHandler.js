import { AppError, logger } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Pembungkus async handler agar error otomatis diteruskan ke errorHandler
 * tanpa perlu try/catch di tiap controller.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Handler 404 untuk route yang tidak dikenal.
 */
export function notFound(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Error handler terpusat. Membedakan error operasional (AppError) dari
 * bug tak terduga, dan menyembunyikan detail di mode produksi.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;

  if (!isOperational || statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err.stack || err.message);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  }

  const payload = {
    status: 'error',
    message: isOperational ? err.message : 'Terjadi kesalahan internal pada server.',
  };
  if (isOperational && err.details) payload.details = err.details;
  if (!config.isProd && !isOperational) payload.stack = err.stack;

  res.status(statusCode).json(payload);
}
