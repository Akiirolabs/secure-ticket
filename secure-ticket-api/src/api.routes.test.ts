import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "./app";
import { config } from "./config";
import { createAuthToken, validCredentials, tickets } from "./data";

describe("API routes", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "OK" });
  });

  it("should return an auth token for valid credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: validCredentials.email, password: validCredentials.password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");

    const decoded = jwt.verify(response.body.token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    expect(decoded.email).toBe(validCredentials.email);
    expect(decoded.role).toBe(validCredentials.role);
  });

  it("should reject invalid login credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "bad@example.com", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("should require authorization for tickets", async () => {
    const response = await request(app).get("/tickets");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing authorization token");
  });

  it("should return tickets when authorized", async () => {
    const token = createAuthToken();
    const response = await request(app)
      .get("/tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tickets).toEqual(tickets);
  });
});
