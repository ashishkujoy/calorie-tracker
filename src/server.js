import { Hono } from "hono";
import { requestLogger } from "./middleware/requestLogger.js";

export const createApp = (db) => {
  const app = new Hono();

  app.use("*", async (ctx, next) => {
    ctx.set("db", db);
    await next();
  });

  app.use("*", requestLogger);

  app.get("/health", (ctx) => {
    return ctx.json({ status: "ok" });
  });

  return app;
}
