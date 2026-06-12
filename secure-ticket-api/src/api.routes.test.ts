import argon2 from "argon2";
import jwt from "jsonwebtoken";
import request from "supertest";
import { Role, TicketSeverity, TicketStatus, type User } from "@prisma/client";
import { app } from "./app";
import { config } from "./config";
import { createAuthToken, demoCredentials } from "./data";
import { prisma } from "./db";

const baseTicket = {
  id: "INC-TEST-001",
  title: "Database cluster latency spike",
  description: "Latency is affecting payment processing.",
  system: "Payments Engine",
  severity: TicketSeverity.CRITICAL,
  status: TicketStatus.OPEN,
  assignedTo: "NOC Analyst"
};

describe("API routes", () => {
  let analyst: User;
  let admin: User;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(demoCredentials.password);
    analyst = await prisma.user.upsert({
      where: { email: demoCredentials.email },
      update: { passwordHash, role: Role.ANALYST },
      create: {
        email: demoCredentials.email,
        passwordHash,
        role: Role.ANALYST
      }
    });
    admin = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: "admin@example.com",
        passwordHash,
        role: Role.ADMIN
      }
    });
  });

  beforeEach(async () => {
    await prisma.ticket.deleteMany();
    await prisma.ticket.create({
      data: {
        ...baseTicket,
        createdById: analyst.id
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const authToken = () => createAuthToken(analyst);

  it("should return health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "OK" });
  });

  it("should return an auth token for valid database credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send(demoCredentials);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");

    const decoded = jwt.verify(response.body.token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    expect(decoded.email).toBe(demoCredentials.email);
    expect(decoded.role).toBe(Role.ANALYST);
  });

  it("should reject invalid login credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: demoCredentials.email, password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("should register a new user with the user role", async () => {
    const email = "new-user@example.com";
    await prisma.user.deleteMany({ where: { email } });

    const response = await request(app)
      .post("/auth/register")
      .send({ email, password: "new-password" });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email, role: "USER" });
    expect(typeof response.body.token).toBe("string");

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe("new-password");
  });

  it("should reject duplicate registration", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send(demoCredentials);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("already exists");
  });

  it("should return the current database user", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: analyst.id,
      email: analyst.email,
      role: "ANALYST"
    });
  });

  it("should change a user's password", async () => {
    const email = "password-user@example.com";
    const originalPassword = "original-password";
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await argon2.hash(originalPassword), role: Role.USER },
      create: {
        email,
        passwordHash: await argon2.hash(originalPassword),
        role: Role.USER
      }
    });

    const response = await request(app)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${createAuthToken(user)}`)
      .send({
        currentPassword: originalPassword,
        newPassword: "replacement-password"
      });

    expect(response.status).toBe(200);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password: "replacement-password" });
    expect(login.status).toBe(200);
  });

  it("should allow admins to list users and change another user's role", async () => {
    const email = "role-user@example.com";
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: Role.USER },
      create: {
        email,
        passwordHash: await argon2.hash("role-password"),
        role: Role.USER
      }
    });
    const adminToken = createAuthToken(admin);

    const listResponse = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.users).toEqual(
      expect.arrayContaining([expect.objectContaining({ email })])
    );

    const updateResponse = await request(app)
      .patch(`/admin/users/${user.id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "ANALYST" });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user.role).toBe("ANALYST");
  });

  it("should block non-admin users from user administration", async () => {
    const response = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.status).toBe(403);
  });

  it("should require authorization for tickets", async () => {
    const response = await request(app).get("/tickets");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing authorization token");
  });

  it("should return persisted tickets when authorized", async () => {
    const response = await request(app)
      .get("/tickets")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.tickets[0]).toMatchObject({
      ...baseTicket,
      createdBy: demoCredentials.email
    });
  });

  it("should create a persisted ticket when authorized", async () => {
    const response = await request(app)
      .post("/tickets")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        title: "Customer portal unavailable",
        description: "Users receive gateway errors when opening the portal.",
        system: "Customer Portal",
        severity: "HIGH"
      });

    expect(response.status).toBe(201);
    expect(response.body.ticket).toMatchObject({
      title: "Customer portal unavailable",
      system: "Customer Portal",
      severity: "HIGH",
      status: "OPEN",
      assignedTo: "Unassigned",
      createdBy: demoCredentials.email
    });
    await expect(
      prisma.ticket.findUnique({ where: { id: response.body.ticket.id } })
    ).resolves.not.toBeNull();
  });

  it("should update persisted ticket status and assignment", async () => {
    const response = await request(app)
      .patch(`/tickets/${baseTicket.id}`)
      .set("Authorization", `Bearer ${authToken()}`)
      .send({ status: "IN_PROGRESS", assignedTo: "Platform Operations" });

    expect(response.status).toBe(200);
    expect(response.body.ticket).toMatchObject({
      id: baseTicket.id,
      status: "IN_PROGRESS",
      assignedTo: "Platform Operations"
    });

    await expect(
      prisma.ticket.findUnique({ where: { id: baseTicket.id } })
    ).resolves.toMatchObject({
      status: TicketStatus.IN_PROGRESS,
      assignedTo: "Platform Operations"
    });
  });

  it("should block regular users from changing ticket workflow", async () => {
    const user = await prisma.user.upsert({
      where: { email: "ticket-user@example.com" },
      update: { role: Role.USER },
      create: {
        email: "ticket-user@example.com",
        passwordHash: await argon2.hash("ticket-password"),
        role: Role.USER
      }
    });

    const response = await request(app)
      .patch(`/tickets/${baseTicket.id}`)
      .set("Authorization", `Bearer ${createAuthToken(user)}`)
      .send({ status: "RESOLVED" });

    expect(response.status).toBe(403);
  });

  it("should reject unsupported ticket status values", async () => {
    const response = await request(app)
      .patch(`/tickets/${baseTicket.id}`)
      .set("Authorization", `Bearer ${authToken()}`)
      .send({ status: "WAITING_FOREVER" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid status");
  });

  it("should delete a persisted ticket when authorized", async () => {
    const response = await request(app)
      .delete(`/tickets/${baseTicket.id}`)
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.ticket.id).toBe(baseTicket.id);
    await expect(
      prisma.ticket.findUnique({ where: { id: baseTicket.id } })
    ).resolves.toBeNull();
  });

  it("should return 404 when deleting an unknown ticket", async () => {
    const response = await request(app)
      .delete("/tickets/INC-DOES-NOT-EXIST")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Ticket not found");
  });
});
