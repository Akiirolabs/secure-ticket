import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../db";
import { AppError } from "../utils/AppError";
import type { AuthenticatedUser } from "../types/express";

export const authMiddleware: RequestHandler = async (req, _res, next) => {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true }
    });

    if (!user || user.email !== decoded.email || user.role !== decoded.role) {
      return next(new AppError("Invalid authorization token", 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return next();
  } catch {
    return next(new AppError("Invalid authorization token", 401));
  }
};
