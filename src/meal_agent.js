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
  return { success: true, meal: caloriesResult.res };
};
