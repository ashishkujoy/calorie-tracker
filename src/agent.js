import { readFile } from "fs/promises";
import { createFoodRecogniser } from "./food_recogniser.js";

const main = async () => {
  const imgPath = process.argv[2];
  const file = await readFile(imgPath);

  const foodRecogniser = createFoodRecogniser();
  const res = await foodRecogniser(file);
  console.log(res);
};

main();
