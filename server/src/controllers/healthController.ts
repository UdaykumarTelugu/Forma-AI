import { Request, Response } from 'express';
import { isDatabaseConnected } from '../config/database';

/**
 * Health check controller
 * GET /api/health
 */
export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const dbStatus = isDatabaseConnected() ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
};
