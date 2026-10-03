import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.ts";
import { openapi } from "./openapi.ts";
import { callsRouter } from "./modules/calls/calls.router.ts";
import { healthRouter } from "./modules/health/health.router.ts";
import { notificationsRouter } from "./modules/notifications/notifications.router.ts";
import { profileRouter } from "./modules/profile/profile.router.ts";
import { sourcesRouter } from "./modules/sources/sources.router.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  // Swagger UI
  app.get("/openapi.json", (_req, res) => res.json(openapi));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  // Routes
  app.use("/health", healthRouter);
  app.use("/api/calls", callsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/sources", sourcesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
