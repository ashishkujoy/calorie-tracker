import { Hono } from "hono";
import { requestLogger } from "./middleware/requestLogger.js";
import authRouter from "./routes/auth.js";
import mealsRouter from "./routes/meals.js";
import statsRouter from "./routes/stats.js";

export const createApp = (db) => {
  const app = new Hono();

  app.use("*", async (ctx, next) => {
    ctx.set("db", db);
    await next();
  });

  app.use("*", requestLogger);

  app.get("/health", (ctx) => ctx.json({ status: "ok" }));
  app.route("/auth", authRouter);
  app.route("/meals", mealsRouter);
  app.route("/stats", statsRouter);

  return app;
}
