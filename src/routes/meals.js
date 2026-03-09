import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";

const mealsRouter = new Hono();

mealsRouter.use("*", requireAuth);

mealsRouter.post("/scan-and-record", (ctx) => ctx.json({ success: true }));

export default mealsRouter;
