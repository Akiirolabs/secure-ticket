import crypto from "crypto";
import argon2 from "argon2";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { TicketSeverity, TicketStatus, type Prisma } from "@prisma/client";
import { createAuthToken } from "./data";
import { prisma } from "./db";
import { logEvents } from "./logger";
import { authMiddleware } from "./middleware/auth.middleware";
import { errorMiddleware, notFoundHandler } from "./middleware/error.middleware";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";
import { AppError } from "./utils/AppError";
import { asyncHandler } from "./utils/asyncHandler";

const ticketWithCreator = {
  createdBy: {
    select: {
      email: true
    }
  }
} satisfies Prisma.TicketInclude;

type TicketRecord = Prisma.TicketGetPayload<{
  include: typeof ticketWithCreator;
}>;

const serializeTicket = (ticket: TicketRecord) => ({
  id: ticket.id,
  title: ticket.title,
  description: ticket.description,
  system: ticket.system,
  severity: ticket.severity,
  status: ticket.status,
  createdBy: ticket.createdBy.email,
  assignedTo: ticket.assignedTo,
  updatedAt: ticket.updatedAt.toISOString()
});

const getTicketId = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const startedAt = Date.now();

    req.requestId = `req_${crypto.randomUUID()}`;
    res.setHeader("X-Request-Id", req.requestId);
    logEvents.requestReceived(req.requestId, req.method, req.originalUrl);

    res.once("finish", () => {
      logEvents.requestCompleted(
        req.requestId,
        req.method,
        req.originalUrl,
        res.statusCode,
        Date.now() - startedAt,
        req.user?.id
      );
    });

    next();
  });

  app.use(rateLimitMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ success: true, message: "OK" });
  });

  app.post(
    "/auth/login",
    asyncHandler(async (req, res, next) => {
      const email =
        typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";

      logEvents.controllerStarted(req.requestId, "AUTH_LOGIN", undefined, {
        email
      });

      const user = email
        ? await prisma.user.findUnique({
            where: { email }
          })
        : null;
      const passwordMatches =
        user && password ? await argon2.verify(user.passwordHash, password) : false;

      if (!user || !passwordMatches) {
        logEvents.userLoginFailed(req.requestId, email);
        return next(new AppError("Invalid email or password", 401));
      }

      const token = createAuthToken(user);
      logEvents.controllerSucceeded(req.requestId, "AUTH_LOGIN", 0, user.id);
      logEvents.userLoginSuccess(req.requestId, user.id);
      return res.json({ success: true, token });
    })
  );

  app.get(
    "/tickets",
    authMiddleware,
    asyncHandler(async (req, res) => {
      logEvents.controllerStarted(req.requestId, "GET_TICKETS", req.user?.id);
      const tickets = await prisma.ticket.findMany({
        include: ticketWithCreator,
        orderBy: { updatedAt: "desc" }
      });

      res.json({ success: true, tickets: tickets.map(serializeTicket) });
      logEvents.controllerSucceeded(req.requestId, "GET_TICKETS", 0, req.user?.id);
    })
  );

  app.post(
    "/tickets",
    authMiddleware,
    asyncHandler(async (req, res, next) => {
      logEvents.controllerStarted(req.requestId, "CREATE_TICKET", req.user?.id, {
        title: req.body.title
      });

      const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body.description === "string" ? req.body.description.trim() : "";
      const system = typeof req.body.system === "string" ? req.body.system.trim() : "";
      const severity = req.body.severity;

      if (!title || !description || !system || !severity) {
        return next(
          new AppError(
            "Missing required fields: title, description, system, severity",
            400
          )
        );
      }

      if (!Object.values(TicketSeverity).includes(severity)) {
        return next(
          new AppError(
            `Invalid severity. Must be one of: ${Object.values(TicketSeverity).join(", ")}`,
            400
          )
        );
      }

      const ticket = await prisma.ticket.create({
        data: {
          id: `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          title,
          description,
          system,
          severity,
          createdById: req.user!.id
        },
        include: ticketWithCreator
      });

      logEvents.controllerSucceeded(req.requestId, "CREATE_TICKET", 0, req.user?.id);
      logEvents.ticketCreated(req.requestId, req.user!.id, ticket.id);
      res.status(201).json({ success: true, ticket: serializeTicket(ticket) });
    })
  );

  app.patch(
    "/tickets/:ticketId",
    authMiddleware,
    asyncHandler(async (req, res, next) => {
      const ticketId = getTicketId(req.params.ticketId);
      const status = req.body.status;
      const assignedTo =
        typeof req.body.assignedTo === "string" ? req.body.assignedTo.trim() : undefined;

      logEvents.controllerStarted(req.requestId, "UPDATE_TICKET", req.user?.id, {
        ticketId
      });

      if (status !== undefined && !Object.values(TicketStatus).includes(status)) {
        return next(
          new AppError(
            `Invalid status. Must be one of: ${Object.values(TicketStatus).join(", ")}`,
            400
          )
        );
      }

      if (req.body.assignedTo !== undefined && !assignedTo) {
        return next(new AppError("assignedTo must be a non-empty string", 400));
      }

      if (status === undefined && assignedTo === undefined) {
        return next(new AppError("Provide status or assignedTo to update the ticket", 400));
      }

      const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!existing) {
        return next(new AppError("Ticket not found", 404));
      }

      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(assignedTo !== undefined ? { assignedTo } : {})
        },
        include: ticketWithCreator
      });

      logEvents.controllerSucceeded(req.requestId, "UPDATE_TICKET", 0, req.user?.id, {
        ticketId
      });
      logEvents.ticketUpdated(req.requestId, req.user!.id, ticketId);
      res.json({ success: true, ticket: serializeTicket(ticket) });
    })
  );

  app.delete(
    "/tickets/:ticketId",
    authMiddleware,
    asyncHandler(async (req, res, next) => {
      const ticketId = getTicketId(req.params.ticketId);

      logEvents.controllerStarted(req.requestId, "DELETE_TICKET", req.user?.id, {
        ticketId
      });

      const existing = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: ticketWithCreator
      });
      if (!existing) {
        return next(new AppError("Ticket not found", 404));
      }

      await prisma.ticket.delete({ where: { id: ticketId } });

      logEvents.controllerSucceeded(req.requestId, "DELETE_TICKET", 0, req.user?.id, {
        ticketId
      });
      logEvents.ticketDeleted(req.requestId, req.user!.id, ticketId);
      res.json({ success: true, ticket: serializeTicket(existing) });
    })
  );

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
