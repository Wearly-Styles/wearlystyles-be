import { createApp } from "./app";
import { initializeDatabase } from "@config/db";
import config from "@config/env";
import logger from "@config/logger";

const startServer = async () => {
  try {
    await initializeDatabase();

    const app = createApp();

    app.listen(config.port, "0.0.0.0", () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.node_env}`);
      logger.info(`Health: http://0.0.0.0:${config.port}/health`);
      logger.info(
        `API Documentation: http://localhost:${config.port}/api-docs`,
      );
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();
