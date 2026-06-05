import type { JwtPayload } from "jsonwebtoken";

export type UserRole = "USER" | "ANALYST" | "ADMIN";

export type AuthenticatedUser = JwtPayload & {
  id: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
