import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../utils/AppError";
import type { AuthenticatedUser } from "../types/express";

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Missing authorization token", 401));
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUser;

    if (!decoded.id || !decoded.email || !decoded.role) {
      return next(new AppError("Invalid authorization token", 401));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    return next();
  } catch {
    return next(new AppError("Invalid authorization token", 401));
  }
};
