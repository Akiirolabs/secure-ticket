import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logEvents } from "../logger";
import { AppError } from "../utils/AppError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  _next
) => {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    logEvents.validationFailed(requestId, err.issues, req.originalUrl);

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      requestId
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode === 403) {
      logEvents.permissionDenied(requestId, req.user?.id, req.originalUrl);
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId
    });
  }

  logEvents.unhandledServerError(requestId, err);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId
  });
};
