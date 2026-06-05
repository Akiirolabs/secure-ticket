import express from "express";
import request from "supertest";
import { z } from "zod";
import {
  errorMiddleware,
  notFoundHandler
} from "./error.middleware";
import { AppError } from "../utils/AppError";

const buildApp = () => {
  const app = express();

  app.use(express.json());
  app.use((req, res, next) => {
    req.requestId = "req_test";
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });

  app.post("/validate", (req, res, next) => {
    try {
      z.object({ email: z.string().email() }).parse(req.body);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/forbidden", (_req, _res, next) => {
    next(new AppError("Permission denied", 403));
  });

  app.get("/server-error", () => {
    throw new Error("Boom");
  });

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
};

describe("errorMiddleware", () => {
  it("returns clean JSON for invalid routes", async () => {
    const response = await request(buildApp()).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Route not found: GET /missing",
      requestId: "req_test"
    });
  });

  it("returns clean JSON for bad input", async () => {
    const response = await request(buildApp())
      .post("/validate")
      .send({ email: "bad-email" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Validation failed",
      requestId: "req_test"
    });
  });

  it("returns clean JSON for forbidden requests", async () => {
    const response = await request(buildApp()).get("/forbidden");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Permission denied");
    expect(response.body.requestId).toBe("req_test");
  });

  it("returns clean JSON for unhandled server errors", async () => {
    const response = await request(buildApp()).get("/server-error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error",
      requestId: "req_test"
    });
  });
});
