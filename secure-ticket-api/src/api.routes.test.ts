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
