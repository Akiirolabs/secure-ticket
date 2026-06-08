import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "./config";
import type { UserRole } from "./types/express";

export type Ticket = {
  id: string;
  title: string;
  system: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdBy: string;
  assignedTo: string;
  updatedAt: string;
  description: string;
};

export const tickets: Ticket[] = [
  {
    id: "INC-24087",
    title: "Database cluster latency spike",
    system: "Payments Engine",
    severity: "CRITICAL",
    status: "OPEN",
    createdBy: "Ops Team",
    assignedTo: "NOC Analyst",
    updatedAt: "5 minutes ago",
    description: "A latency spike has been detected in the payments cluster affecting transaction throughput."
  },
  {
    id: "INC-24091",
    title: "Login auth failures reported",
    system: "Identity Service",
    severity: "HIGH",
    status: "IN_PROGRESS",
    createdBy: "Security Team",
    assignedTo: "Auth Team",
    updatedAt: "12 minutes ago",
    description: "Users are reporting intermittent login failures with 401 responses. Investigation is underway."
  },
  {
    id: "INC-24096",
    title: "API gateway TLS renewal pending",
    system: "Gateway",
    severity: "MEDIUM",
    status: "RESOLVED",
    createdBy: "Platform Team",
    assignedTo: "NOC Analyst",
    updatedAt: "1 hour ago",
    description: "A certificate renewal is pending on the API gateway cluster and monitoring is in place."
  }
];

export const validCredentials = {
  email: "analyst@aegiscore.example",
  password: "demo-password",
  role: "ANALYST" as UserRole,
  id: "user_analyst"
};

export const createAuthToken = () => {
  return jwt.sign(
    {
      id: validCredentials.id,
      email: validCredentials.email,
      role: validCredentials.role
    },
    config.jwt.secret as jwt.Secret,
    {
      expiresIn: config.jwt.expiresIn
    } as SignOptions
  );
};
