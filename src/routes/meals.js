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

  const imageThumbnail = `data:${image.type};base64,${imageBuffer.toString("base64")}`;
  const user = ctx.get("user");
  const db = ctx.get("db");

  await insertMeal(db, {
    userId: new ObjectId(user.id),
    recordedAt: new Date(),
    mealName: analysisResult.meal.mealName,
    imageThumbnail,
    items: analysisResult.meal.items,
    totals: analysisResult.meal.totals,
  });

  return ctx.json({ meal: analysisResult.meal });
});

mealsRouter.get("/history", async (ctx) => {
  const user = ctx.get("user");
  const db = ctx.get("db");

  const meals = await db
    .collection("meals")
    .find(
      { userId: new ObjectId(user.id) },
      { projection: { _id: 1, mealName: 1, imageThumbnail: 1, recordedAt: 1, totals: 1 } }
    )
    .sort({ recordedAt: -1 })
    .toArray();

  return ctx.json({
    meals: meals.map((m) => ({ id: m._id.toString(), mealName: m.mealName, imageThumbnail: m.imageThumbnail, recordedAt: m.recordedAt, totals: m.totals })),
  });
});

mealsRouter.delete("/:id", async (ctx) => {
  const { id } = ctx.req.param();

  if (!ObjectId.isValid(id)) {
    return ctx.json({ error: "Invalid meal id" }, 400);
  }

  const user = ctx.get("user");
  const db = ctx.get("db");

  const result = await db.collection("meals").deleteOne({
    _id: new ObjectId(id),
    userId: new ObjectId(user.id),
  });

  if (result.deletedCount === 0) {
    return ctx.json({ error: "Meal not found" }, 404);
  }

  return ctx.json({ deleted: true });
});

export default mealsRouter;
