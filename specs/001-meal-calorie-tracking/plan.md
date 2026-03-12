# Implementation Plan: Meal Calorie Tracking

**Branch**: `001-meal-calorie-tracking` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-meal-calorie-tracking/spec.md`

## Summary

Wire the existing AI pipeline (`food_recogniser.js` → `calories_counter.js`) into the `/meals/scan-and-record` HTTP route, replacing the current dummy response. Introduce `src/meal_agent.js` as the importable pipeline module and `src/models/meal.js` for persistence. Add a `meals` MongoDB collection with a `userId` index. All agent output is Zod-validated before storage. Full test coverage via co-located `meals.test.js` using in-memory MongoDB and mocked Ollama calls.

## Technical Context

**Language/Version**: Node.js 20 (ESM — `"type": "module"`)
**Primary Dependencies**: Hono 4 + `@hono/node-server`; `@langchain/ollama` + `@langchain/core`; Zod 4; `mongodb`; `jsonwebtoken`; Pino
**Storage**: MongoDB 7 (`mongodb` driver); `mongodb-memory-server` for tests
**Testing**: Vitest 4 (co-located tests); `mongodb-memory-server` (hermetic DB); Ollama calls mocked via `vi.mock()`
**Target Platform**: Linux/macOS server (personal tool, single-user scale)
**Project Type**: Web service (Hono REST API + static frontend)
**Performance Goals**: Analysis results displayed within 15 seconds (SC-001) — driven by Ollama inference latency, not application code
**Constraints**: Ollama must be running locally with `gemma3` and `gpt-oss` models available; no external paid APIs
**Scale/Scope**: Single user / personal tool; no concurrency constraints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Security by Default** | ✅ PASS | `mealsRouter.use("*", requireAuth)` already guards all `/meals/*` routes. No unguarded endpoints added. JWT flows through `src/lib/jwt.js`. |
| **II. API-First** | ✅ PASS | All functionality exposed via `POST /meals/scan-and-record`. Handler in `src/routes/meals.js`. DB and auth injected via Hono context. Response shape stable. |
| **III. Test-First** | ✅ PASS | `src/routes/meals.test.js` to be written first (Red-Green-Refactor). In-memory MongoDB via `mongodb-memory-server`. Ollama calls mocked. |
| **IV. AI-Augmented** | ✅ PASS | Pipeline flows through `src/meal_agent.js` (backed by `food_recogniser.js` and `calories_counter.js`). Output validated with Zod (`mealRecordSchema`) before storage. AI failures return structured errors, never silent bad data. |
| **V. Simplicity (YAGNI)** | ✅ PASS | No new abstractions. `meal_agent.js` is a thin orchestration module (not a full LangGraph StateGraph). `meal.js` model exposes a single `insertMeal()` function. No repositories, factories, or service-locators. |

*Post-design re-check*: All five gates remain green after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-calorie-tracking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── POST_meals_scan-and-record.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── index.js
├── server.js
├── db.js                     ← add meals index to ensureIndexes()
├── agent.js                  ← unchanged (CLI dev tool)
├── meal_agent.js             ← NEW: exports runMealAnalysis(imageBuffer)
├── food_recogniser.js        ← unchanged
├── calories_counter.js       ← unchanged
├── lib/
│   ├── jwt.js
│   └── logger.js
├── middleware/
│   ├── requestLogger.js
│   └── requireAuth.js
├── models/
│   ├── user.js
│   ├── refreshToken.js
│   └── meal.js               ← NEW: insertMeal(db, doc) + mealRecordSchema
└── routes/
    ├── auth.js
    ├── meals.js               ← UPDATED: replaces DUMMY_MEAL with AI pipeline
    ├── meals.test.js          ← NEW: co-located tests
    └── stats.js

tests/
└── public/
    ├── dashboard.test.js
    └── meal-scan.test.js      ← existing, no changes needed
```

**Structure Decision**: Single project (Option 1). Frontend is static files in `public/`; backend is `src/`. No structural change needed — all new files fit within the existing layout.

## Implementation Sequence

### Step 1: `src/models/meal.js` (New)

Create the meal model with Zod schema and `insertMeal` function:

```js
// src/models/meal.js
import * as z from "zod/v4";
import { ObjectId } from "mongodb";

const nutritionSchema = z.object({
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative(),
  sugar_g: z.number().nonnegative(),
});

export const mealRecordSchema = z.object({
  userId: z.instanceof(ObjectId),
  recordedAt: z.instanceof(Date),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.string().min(1),
    nutrition: nutritionSchema,
  })).min(1),
  totals: nutritionSchema,
});

// Returns the inserted document's _id
export const insertMeal = async (db, mealDoc) => {
  const validated = mealRecordSchema.parse(mealDoc);
  const result = await db.collection("meals").insertOne(validated);
  return result.insertedId;
};
```

### Step 2: `src/meal_agent.js` (New)

Thin orchestration module backed by the two existing AI modules:

```js
// src/meal_agent.js
import { createFoodRecogniser } from "./food_recogniser.js";
import { createCaloriesCounter } from "./calories_counter.js";

const foodRecogniser = createFoodRecogniser();
const caloriesCounter = createCaloriesCounter();

// imageBuffer: Node.js Buffer
// Returns: { success: true, meal: { items, totals } }
//       or { success: false, stage: "recognition"|"calories", error }
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
```

### Step 3: `src/db.js` (Update)

Add `meals` index inside `ensureIndexes()`:

```js
await db.collection("meals").createIndex({ userId: 1 });
```

### Step 4: `src/routes/meals.js` (Update)

Replace `DUMMY_MEAL` response with real pipeline call and persistence:

```js
import { ObjectId } from "mongodb";
import { runMealAnalysis } from "../meal_agent.js";
import { insertMeal } from "../models/meal.js";

mealsRouter.post("/scan-and-record", async (ctx) => {
  // ... existing image validation ...

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const analysisResult = await runMealAnalysis(imageBuffer);

  if (!analysisResult.success) {
    const msg = analysisResult.stage === "recognition"
      ? "Could not identify any food items in the image. Please try again with a clearer photo."
      : "Nutrition analysis failed. Please try again.";
    return ctx.json({ error: msg }, 422);
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
```

### Step 5: `src/routes/meals.test.js` (New)

Co-located tests covering:
- Happy path: valid image → 200 + correct meal shape + DB record created
- Recognition failure: AI returns empty items → 422 + no DB record
- Calories failure: AI returns error → 422 + no DB record
- Missing image field → 400
- Wrong MIME type → 400
- File too large → 413
- Unauthenticated request → 401

Mock strategy: `vi.mock("../meal_agent.js")` and `vi.mock("../models/meal.js")` for unit tests; use in-memory MongoDB for integration assertions.

## Complexity Tracking

No constitution violations. Complexity Tracking table not required.
