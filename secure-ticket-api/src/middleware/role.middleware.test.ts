import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { config } from "../config";
import { authMiddleware } from "./auth.middleware";
import { errorMiddleware } from "./error.middleware";
import { requireRole } from "./role.middleware";

const tokenFor = (role: string) =>
  jwt.sign(
    { id: "user_123", email: "user@example.com", role },
    config.jwt.secret
  );

const buildApp = () => {
  const app = express();

  app.use((req, res, next) => {
    req.requestId = "req_test";
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });

  app.delete(
    "/admin-only",
    authMiddleware,
    requireRole("ADMIN"),
    (_req, res) => {
      res.json({ success: true });
    }
  );

  app.patch(
    "/analyst-or-admin",
    authMiddleware,
    requireRole("ANALYST", "ADMIN"),
    (_req, res) => {
      res.json({ success: true });
    }
  );

  app.use(errorMiddleware);

  return app;
};

describe("requireRole", () => {
  it("blocks users without the required role", async () => {
    const response = await request(buildApp())
      .delete("/admin-only")
      .set("Authorization", `Bearer ${tokenFor("USER")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Permission denied");
  });

  it("allows analysts to update ticket-like resources", async () => {
    const response = await request(buildApp())
      .patch("/analyst-or-admin")
      .set("Authorization", `Bearer ${tokenFor("ANALYST")}`);

    expect(response.status).toBe(200);
  });

  it("allows admins to delete ticket-like resources", async () => {
    const response = await request(buildApp())
      .delete("/admin-only")
      .set("Authorization", `Bearer ${tokenFor("ADMIN")}`);

    expect(response.status).toBe(200);
  });

  it("blocks invalid roles", async () => {
    const response = await request(buildApp())
      .delete("/admin-only")
      .set("Authorization", `Bearer ${tokenFor("ROOT")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Permission denied");
  });
});
