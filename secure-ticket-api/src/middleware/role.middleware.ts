import type { RequestHandler } from "express";
import type { UserRole } from "../types/express";
import { AppError } from "../utils/AppError";

export const requireRole =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Missing authorization token", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Permission denied", 403));
    }

    return next();
  };
