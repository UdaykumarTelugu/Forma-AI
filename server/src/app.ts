import express, { Application } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import healthRoutes from './routes/healthRoutes';
import formRoutes from './routes/formRoutes';
import aiRoutes from './routes/aiRoutes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app: Application = express();

  // Core Middleware
  app.use(
    cors({
      origin: ENV.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/forms', formRoutes);
  app.use('/api/ai', aiRoutes);

  // Catch-all & Error Middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
