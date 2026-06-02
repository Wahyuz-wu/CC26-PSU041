/**
 * Logger sederhana dengan timestamp & level. Sengaja tanpa dependency
 * agar ringan. Bisa diganti pino/winston bila butuh fitur lebih.
 */
function ts() {
  return new Date().toISOString();
}

export const logger = {
  info: (...args) => console.log(`${ts()} [INFO]`, ...args),
  warn: (...args) => console.warn(`${ts()} [WARN]`, ...args),
  error: (...args) => console.error(`${ts()} [ERROR]`, ...args),
  debug: (...args) => {
    if (process.env.DEBUG) console.debug(`${ts()} [DEBUG]`, ...args);
  },
};

/**
 * Error aplikasi dengan HTTP status. Dipakai agar errorHandler bisa
 * membedakan error yang "diharapkan" (validasi, upstream) dari bug tak terduga.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

export class UpstreamError extends AppError {
  constructor(message, statusCode = 502, details) {
    super(message, statusCode, details);
    this.name = 'UpstreamError';
  }
}
