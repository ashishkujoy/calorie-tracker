import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";

const statsRouter = new Hono();

statsRouter.use("*", requireAuth);

statsRouter.get("/", (ctx) => ctx.json({ stats: {} }));

export default statsRouter;
