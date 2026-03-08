import { Hono } from "hono";
import { requestLogger } from "./middleware/requestLogger.js";
import authRouter from "./routes/auth.js";

export const createApp = (db) => {
  const app = new Hono();

  app.use("*", async (ctx, next) => {
    ctx.set("db", db);
    await next();
  });

  app.use("*", requestLogger);

  app.get("/health", (ctx) => ctx.json({ status: "ok" }));
  app.route("/auth", authRouter);

  return app;
}
