import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "langchain";
import * as z from "zod/v4";

const systemPrompt = `You are a **nutrition analysis engine**.

Your task is to calculate **accurate nutritional values** for each food or drink item provided in a JSON list.

INPUT FORMAT
You will receive an array of food objects in the format:

[
  {
    "name": "Food name",
    "type": "category",
    "quantity": "human readable quantity"
  }
]

Example quantity formats include:

* "Approximately 50g"
* "1 sandwich (approximately 100g)"
* "1 cup"
* "2 tbsp"
* "1 medium apple"
* "250ml"

---

YOUR RESPONSIBILITIES

1. **Parse the quantity**

   * Extract numeric value and unit.
   * Convert all quantities to **grams (g)** for solid foods and **milliliters (ml)** for liquids when possible.
   * If both a count and weight are given (e.g. '1 sandwich (100g)'), **use the weight**.

2. **Use reliable nutrition averages**
   Base calculations on trusted nutritional datasets such as:

   * USDA FoodData Central
   * standard nutrition tables
   * widely accepted averages for whole foods.

3. **Calculate nutrients proportional to weight**
   Compute values for the given quantity using **per-100g nutrition references**.

4. **For composite foods**
   If the item is generic (e.g., "sandwich", "burger", "salad"):

   * Estimate a typical composition using common ingredients.
   * Use realistic nutritional averages.

5. **Return values with realistic precision**

   * Calories → integer
   * Macronutrients → 1 decimal place
   * Fiber → 1 decimal place

6. **Nutrients to calculate**

For each item compute:

* calories (kcal)
* protein (g)
* fat (g)
* carbohydrates (g)
* fiber (g)
* sugar (g)

7. **Also compute totals** for the entire list.

---

IMPORTANT RULES

* Never leave a nutrient blank.
* Always convert quantities before calculating.
* If the quantity is vague ("a handful"), estimate a realistic weight.
* Ensure totals equal the sum of all items.
* Output **only JSON**, no explanations or markdown.
`;

const systemMessage = new SystemMessage(systemPrompt);

const nutritionSchema = z.object({
  calories_kcal: z.number().describe(
    "Total calories present in the item, kcal",
  ),
  protein_g: z.number().describe("Total protein present in the item, in grams"),
  fat_g: z.number().describe("Total fat present in the item, in grams"),
  carbohydrates_g: z.number().describe(
    "Total carbohydrates present in the item, in grams",
  ),
  fiber_g: z.number().describe("Total fiber present in the item, in grams"),
  sugar_g: z.number().describe("Total fiber present in the item, in grams"),
});

const itemSchema = z.object({
  name: z.string().describe("Name of food/drink item"),
  quantity: z.string().describe("Quantity of food in gram or drink in ml"),
  nutrition: nutritionSchema,
});

const responseSchema = z.object({
  items: z.array(itemSchema),
  totals: nutritionSchema,
});

export const createCaloriesCounter = () => {
  const llm = new ChatOllama({
    model: process.env.GPT_MODEL || "gpt-oss",
    temperature: 0,
  }).withStructuredOutput(responseSchema);

  return (items) =>
    llm.invoke([
      systemPrompt,
      new HumanMessage(JSON.stringify(items)),
    ])
      .then((res) => ({ success: true, res }))
      .catch(error => ({success: false, error}));
};
