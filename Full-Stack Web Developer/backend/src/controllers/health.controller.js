import { asyncHandler } from '../middleware/errorHandler.js';
import { checkHealth, getModelInfo } from '../services/mlClient.js';
import { isEnabled as supabaseEnabled } from '../services/supabase.js';
import config from '../config/index.js';

/**
 * GET /api/health
 * Liveness backend + readiness ML service (diteruskan) + status integrasi.
 */
export const health = asyncHandler(async (_req, res) => {
  const ml = await checkHealth();
  res.json({
    status: 'ok',
    service: 'foreca-backend',
    env: config.env,
    ml: {
      reachable: ml.ok,
      status: ml.status,
      detail: ml.body,
      baseUrl: config.ml.baseUrl,
    },
    supabase: { enabled: supabaseEnabled() },
    time: new Date().toISOString(),
  });
});

/**
 * GET /api/model-info — proxy metadata model.
 */
export const modelInfo = asyncHandler(async (_req, res) => {
  const info = await getModelInfo();
  if (!info) {
    return res.status(503).json({ status: 'error', message: 'Metadata model belum tersedia.' });
  }
  res.json(info);
});
