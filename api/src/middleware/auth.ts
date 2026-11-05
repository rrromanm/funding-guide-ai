import type { RequestHandler } from "express";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { env } from "../config/env.ts";
import { ForbiddenError, UnauthorizedError } from "../errors.ts";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError();

  const issuer = new URL("/auth/v1", env.SUPABASE_URL).href;
  jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "authenticated",
    }));
  } catch (err) {
    if (err instanceof errors.JOSEError) {
      throw new UnauthorizedError("Invalid or expired token");
    }
    throw err;
  }

  const appMetadata = payload.app_metadata as { role?: unknown } | undefined;
  if (appMetadata?.role !== "admin") {
    throw new ForbiddenError("This account is not authorised");
  }
  next();
};
