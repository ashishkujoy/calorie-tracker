import { readFile } from "fs/promises";
import { createFoodRecogniser } from "./food_recogniser.js";
import { createCaloriesCounter } from "./calories_counter.js";
import dotenv from "dotenv";
dotenv.config();

const main = async () => {
  const imgPath = process.argv[2];
  const file = await readFile(imgPath);

  const foodRecogniser = createFoodRecogniser();
  const caloriesCounter = createCaloriesCounter();

  const res = await foodRecogniser(file);
  console.log(res);
  console.log("*".repeat(20));
  const caloriesRes = await caloriesCounter(res);
  console.log(JSON.stringify(caloriesRes, null, 4));
};

main();
