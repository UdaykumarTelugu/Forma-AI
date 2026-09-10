import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router: Router = Router();

/**
 * POST /api/ai/extract
 *
 * Extracts structured insurance claim facts from natural language text.
 */
router.post('/extract', (req, res, next) => aiController.extractClaim(req, res, next));

export default router;
