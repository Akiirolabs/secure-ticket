import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logEvents } from "../logger";

export const asyncHandler =
  (handler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export const controllerHandler =
  (action: string, handler: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    logEvents.controllerStarted(req.requestId, action, req.user?.id, {
      method: req.method,
      path: req.originalUrl
    });

    return Promise.resolve(handler(req, res, next))
      .then(() => {
        logEvents.controllerSucceeded(
          req.requestId,
          action,
          Date.now() - startedAt,
          req.user?.id,
          { statusCode: res.statusCode }
        );
      })
      .catch((error) => {
        logEvents.controllerFailed(
          req.requestId,
          action,
          Date.now() - startedAt,
          error,
          req.user?.id
        );
        next(error);
      });
  };
