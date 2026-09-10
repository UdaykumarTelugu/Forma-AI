import { createApp } from './app';
import { connectDatabase } from './config/database';
import { ENV } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();

    app.listen(ENV.PORT, () => {
      console.log(`[Forma AI] Server listening on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server execution
startServer();
