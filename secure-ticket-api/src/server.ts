import { app } from "./app";
import { config } from "./config";
import { logEvents, logger } from "./logger";

const server = app.listen(config.port, () => {
  logEvents.appStarted(config.port);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down server");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
