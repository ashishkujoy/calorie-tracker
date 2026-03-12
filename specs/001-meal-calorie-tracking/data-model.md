# Data Model: Meal Calorie Tracking

**Branch**: `001-meal-calorie-tracking` | **Date**: 2026-03-10

## New Collection: `meals`

### Document Shape

```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "recordedAt": ISODate,
  "items": [
    {
      "name": "string",
      "quantity": "string",
      "nutrition": {
        "calories_kcal": number,
        "protein_g": number,
        "fat_g": number,
        "carbohydrates_g": number,
        "fiber_g": number,
        "sugar_g": number
      }
    }
  ],
  "totals": {
    "calories_kcal": number,
    "protein_g": number,
    "fat_g": number,
    "carbohydrates_g": number,
    "fiber_g": number,
    "sugar_g": number
  }
}
```

### Field Descriptions

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `_id` | ObjectId | Auto-generated document identifier | Yes (auto) |
| `userId` | ObjectId | References `users._id` — the authenticated user who logged the meal | Yes |
| `recordedAt` | Date | UTC timestamp of when the meal was uploaded and analysed | Yes |
| `items` | Array | One entry per detected food/drink item | Yes (min 1) |
| `items[].name` | string | Name of the food or drink item | Yes |
| `items[].quantity` | string | Human-readable quantity (e.g. "150g", "1 cup") | Yes |
| `items[].nutrition` | object | Per-item nutrition values | Yes |
| `totals` | object | Sum of all item nutrition values | Yes |
| `totals.calories_kcal` | number | Total meal calories in kcal (integer) | Yes |
| `totals.protein_g` | number | Total protein in grams (1 decimal) | Yes |
| `totals.fat_g` | number | Total fat in grams (1 decimal) | Yes |
| `totals.carbohydrates_g` | number | Total carbohydrates in grams (1 decimal) | Yes |
| `totals.fiber_g` | number | Total fibre in grams (1 decimal) | Yes |
| `totals.sugar_g` | number | Total sugar in grams (1 decimal) | Yes |

### Indexes

| Index | Fields | Options | Purpose |
|-------|--------|---------|---------|
| `meals_userId` | `{ userId: 1 }` | None | Efficient retrieval by user (enables future history feature) |

### Validation Rules

- `userId` must reference an existing user (`users._id`) — enforced by application logic, not a DB constraint.
- `items` array must have at least one element (zero items means analysis failed; no record should be saved).
- All numeric nutrition fields must be non-negative.
- `recordedAt` is set by the server at insert time; client-provided values are ignored.

## Zod Schema (Application Layer)

Defined in `src/models/meal.js`, used to validate agent output before insertion.

```js
const nutritionSchema = z.object({
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative(),
  sugar_g: z.number().nonnegative(),
});

const mealRecordSchema = z.object({
  userId: z.instanceof(ObjectId),
  recordedAt: z.instanceof(Date),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.string().min(1),
    nutrition: nutritionSchema,
  })).min(1),
  totals: nutritionSchema,
});
```

## Existing Collections (No Changes)

| Collection | Change | Notes |
|-----------|--------|-------|
| `users` | None | Used for `userId` reference only |
| `refreshTokens` | None | Auth — unaffected |

## db.js Changes

Add index creation for the `meals` collection inside `ensureIndexes()`:

```js
await db.collection("meals").createIndex({ userId: 1 });
```
