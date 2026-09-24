import express, { type ErrorRequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { healthRouter } from "./routes/health.ts";
import { openapi } from "./openapi.ts";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use(healthRouter);

  app.get("/openapi.json", (_req, res) => res.json(openapi));
  const docsCss = ":root { color-scheme: light; }";
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customCss: docsCss }));

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(onError);

  return app;
}
