#!/usr/bin/env node

/**
 * Development server startup using express-server-factory v2.0.0
 */

import config from '../config/env';

// Import the Express app (uses sync version for backward compatibility)
import { expressApp } from '../app';

// Start the server
async function startServer() {
  try {
    console.log(`Starting server on port ${config.PORT}...`);

    // Use Express directly for development server
    const server = expressApp.listen(config.PORT, () => {
      console.log(`Server listening on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.PORT === 'string' ? 'Pipe ' + config.PORT : 'Port ' + config.PORT;

      switch (error.code) {
        case 'EACCES':
          console.error(bind + ' requires elevated privileges');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(bind + ' is already in use');
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
