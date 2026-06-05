import crypto from "crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { logEvents } from "./logger";
import {
  errorMiddleware,
  notFoundHandler
} from "./middleware/error.middleware";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const startedAt = Date.now();

    req.requestId = `req_${crypto.randomUUID()}`;
    res.setHeader("X-Request-Id", req.requestId);
    logEvents.requestReceived(req.requestId, req.method, req.originalUrl);

    res.once("finish", () => {
      logEvents.requestCompleted(
        req.requestId,
        req.method,
        req.originalUrl,
        res.statusCode,
        Date.now() - startedAt,
        req.user?.id
      );
    });

    next();
  });

  app.use(rateLimitMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ success: true, message: "OK" });
  });

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
