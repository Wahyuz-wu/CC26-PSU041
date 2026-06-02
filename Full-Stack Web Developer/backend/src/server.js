import { createApp } from './app.js';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import { checkHealth } from './services/mlClient.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Foreca backend berjalan di http://localhost:${config.port} (${config.env})`);
  logger.info(`ML service  : ${config.ml.baseUrl}`);
  logger.info(`CORS origins: ${config.corsOrigins.join(', ')}`);

  // Cek kesiapan ML service saat start (tidak memblok).
  checkHealth().then((h) => {
    if (h.ok) logger.info('ML service reachable ✓');
    else logger.warn(`ML service belum reachable (status ${h.status}). Akan dicoba ulang saat ada request.`);
  });
});

// Graceful shutdown.
function shutdown(signal) {
  logger.info(`${signal} diterima, menutup server...`);
  server.close(() => {
    logger.info('Server ditutup.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
