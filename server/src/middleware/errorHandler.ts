import { Request, Response, NextFunction } from 'express';

// TODO: Enhance with structured Zod error parsing and logging
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Unhandled Error]:', err);

  const status = (err as { status?: number }).status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
