import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
import { db } from "./lib/db.ts";

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const app = createApp();
const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => void db.destroy().then(() => process.exit(0)));
  server.closeIdleConnections();

  // ponytail: 5s ceiling so a stuck request can't outlast the orchestrator's kill window
  setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
