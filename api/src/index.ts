import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
import { db } from "./lib/db.ts";

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const app = createApp();
export default app;

if (!process.env.VERCEL) {
  const port = env.PORT;

  const server = app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });

  function shutdown(signal: string) {
    console.log(`${signal} received, shutting down`);
    server.close(() => void db.destroy().then(() => process.exit(0)));
    server.closeIdleConnections();

    setTimeout(() => {
      console.error("Shutdown timed out, forcing exit");
      process.exit(1);
    }, 5000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
