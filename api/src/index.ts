import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`API on http://localhost:${port} — docs at http://localhost:${port}/docs`);
});
