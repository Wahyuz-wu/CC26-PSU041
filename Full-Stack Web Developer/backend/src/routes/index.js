import { Router } from 'express';
import { singleFile } from '../middleware/upload.js';
import { health, modelInfo } from '../controllers/health.controller.js';
import { inspect, analyze, history } from '../controllers/analyze.controller.js';

const router = Router();

// Monitoring & info
router.get('/health', health);
router.get('/model-info', modelInfo);

// Pipeline analisis
router.post('/inspect', singleFile('file'), inspect);
router.post('/analyze', singleFile('file'), analyze);

// Histori (opsional, butuh Supabase)
router.get('/history', history);

export default router;
