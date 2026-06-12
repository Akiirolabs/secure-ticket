import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { config } from "../config";
import { prisma } from "../db";
import { authMiddleware } from "./auth.middleware";
import { errorMiddleware } from "./error.middleware";

const buildApp = () => {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = "req_test";
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });

  app.get("/protected", authMiddleware, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  app.use(errorMiddleware);

  return app;
};

describe("authMiddleware", () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: "user@example.com" },
      update: { id: "user_123", role: "USER" },
      create: {
        id: "user_123",
        email: "user@example.com",
        passwordHash: "not-used-in-this-test",
        role: "USER"
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: "user@example.com" }
    });
  });

  it("blocks missing tokens", async () => {
    const response = await request(buildApp()).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Missing authorization token",
      requestId: "req_test"
    });
  });

  it("blocks fake tokens", async () => {
    const response = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid authorization token");
  });

  it("accepts valid tokens", async () => {
    const token = jwt.sign(
      { id: "user_123", email: "user@example.com", role: "USER" },
      config.jwt.secret
    );

    const response = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: "user_123",
      email: "user@example.com",
      role: "USER"
    });
  });

  it("blocks valid tokens for users that no longer exist", async () => {
    const token = jwt.sign(
      { id: "deleted_user", email: "deleted@example.com", role: "USER" },
      config.jwt.secret
    );

    const response = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid authorization token");
  });
});
