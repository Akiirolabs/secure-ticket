import crypto from "crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { logEvents } from "./logger";
import { authMiddleware } from "./middleware/auth.middleware";
import { errorMiddleware, notFoundHandler } from "./middleware/error.middleware";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";
import { AppError } from "./utils/AppError";
import { createAuthToken, tickets, validCredentials } from "./data";

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

  app.post("/auth/login", (req, res, next) => {
    logEvents.controllerStarted(req.requestId, "AUTH_LOGIN", undefined, {
      email: req.body.email
    });
    const { email, password } = req.body;

    if (email === validCredentials.email && password === validCredentials.password) {
      const token = createAuthToken();
      logEvents.controllerSucceeded(req.requestId, "AUTH_LOGIN", 0, validCredentials.id);
      logEvents.userLoginSuccess(req.requestId, validCredentials.id);
      return res.json({ success: true, token });
    }

    logEvents.userLoginFailed(req.requestId, email);
    return next(new AppError("Invalid email or password", 401));
  });

  app.get("/tickets", authMiddleware, (_req, res) => {
    logEvents.controllerStarted(_req.requestId, "GET_TICKETS", _req.user?.id);
    res.json({ success: true, tickets });
    logEvents.controllerSucceeded(_req.requestId, "GET_TICKETS", 0, _req.user?.id);
  });

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
