import { createFoodRecogniser } from "./food_recogniser.js";
import { createCaloriesCounter } from "./calories_counter.js";

const foodRecogniser = createFoodRecogniser();
const caloriesCounter = createCaloriesCounter();

export const runMealAnalysis = async (imageBuffer) => {
  const recognitionResult = await foodRecogniser(imageBuffer);
  if (!recognitionResult.success || recognitionResult.items.length === 0) {
    return { success: false, stage: "recognition", error: recognitionResult.error };
  }
  const caloriesResult = await caloriesCounter(recognitionResult.items);
  if (!caloriesResult.success) {
    return { success: false, stage: "calories", error: caloriesResult.error };
  }
  const items = Array.isArray(caloriesResult.res.items) ? caloriesResult.res.items : [];
  let mealName;
  if (items.length === 0) {
    mealName = "Meal";
  } else if (items.length === 1) {
    mealName = items[0]?.name || "Meal";
  } else {
    mealName = `${items[0]?.name || "Item"} with ${items[1]?.name || "Item"}`;
  }
  return { success: true, meal: { mealName, ...caloriesResult.res } };
};
