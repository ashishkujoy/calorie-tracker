import * as z from "zod/v4";

const nutritionSchema = z.object({
  calories_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrates_g: z.number(),
  fiber_g: z.number(),
  sugar_g: z.number(),
});

const mealRecordSchema = z.object({
  userId: z.any(),
  recordedAt: z.date(),
  mealName: z.string(),
  imageThumbnail: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      nutrition: nutritionSchema,
    })
  ).min(1),
  totals: nutritionSchema,
});

export const insertMeal = async (db, mealDoc) => {
  const validated = mealRecordSchema.parse(mealDoc);
  const result = await db.collection("meals").insertOne(validated);
  return result.insertedId;
};
