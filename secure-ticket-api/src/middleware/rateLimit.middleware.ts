import rateLimit from "express-rate-limit";
import { config } from "../config";

export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests",
      requestId: req.requestId
    });
  }
});
