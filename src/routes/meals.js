import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";

const mealsRouter = new Hono();

mealsRouter.use("*", requireAuth);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DUMMY_MEAL = {
  name: "Sample Meal",
  items: [
    {
      name: "Grilled Chicken",
      quantity: "150g",
      calories_kcal: 248,
      protein_g: 46.5,
      fat_g: 5.4,
      carbohydrates_g: 0.0,
    },
  ],
  totals: {
    calories_kcal: 248,
    protein_g: 46.5,
    fat_g: 5.4,
    carbohydrates_g: 0.0,
    fiber_g: 0.0,
    sugar_g: 0.0,
  },
};

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

  return ctx.json({ meal: DUMMY_MEAL });
});

export default mealsRouter;
