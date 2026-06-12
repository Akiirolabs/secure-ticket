import type { Role, User } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "./config";

export const demoCredentials = {
  email: "analyst@aegiscore.example",
  password: "demo-password"
};

type TokenUser = Pick<User, "id" | "email" | "role">;

export const createAuthToken = (user: TokenUser) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role satisfies Role
    },
    config.jwt.secret as jwt.Secret,
    {
      expiresIn: config.jwt.expiresIn
    } as SignOptions
  );
