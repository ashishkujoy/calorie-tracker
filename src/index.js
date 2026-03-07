import dotenv from "dotenv";
dotenv.config();

import { serve } from "@hono/node-server";
import { connectDb, closeDb } from "./db.js";
import { createApp } from "./server.js";
import logger from "./lib/logger.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const main = async () => {
  const db = await connectDb();
  const app = createApp(db);

  serve({ fetch: app.fetch, port: PORT });
  logger.info({ port: PORT }, "Server started");

  const shutdown = async () => {
    logger.info("Shutting down");
    await closeDb();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
