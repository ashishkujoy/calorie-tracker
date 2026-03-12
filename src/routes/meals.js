import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { requireAuth } from "../middleware/requireAuth.js";
import { runMealAnalysis } from "../meal_agent.js";
import { insertMeal } from "../models/meal.js";

const mealsRouter = new Hono();

mealsRouter.use("*", requireAuth);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

mealsRouter.post("/scan-and-record", async (ctx) => {
  const body = await ctx.req.parseBody();
  const image = body["image"];

  if (!image || !(image instanceof File) || !image.type.startsWith("image/")) {
    return ctx.json(
      { error: "image field is required and must be an image file" },
      400
    );
  }

  if (image.size > MAX_FILE_SIZE) {
    return ctx.json({ error: "Image exceeds the 10 MB size limit" }, 413);
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const analysisResult = await runMealAnalysis(imageBuffer);

  if (!analysisResult.success) {
    const error =
      analysisResult.stage === "recognition"
        ? "Could not identify any food items in the image. Please try again with a clearer photo."
        : "Nutrition analysis failed. Please try again.";
    return ctx.json({ error }, 422);
  }

  const user = ctx.get("user");
  const db = ctx.get("db");

  await insertMeal(db, {
    userId: new ObjectId(user.id),
    recordedAt: new Date(),
    items: analysisResult.meal.items,
    totals: analysisResult.meal.totals,
  });

  return ctx.json({ meal: analysisResult.meal });
});

export default mealsRouter;
