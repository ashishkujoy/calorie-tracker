# Data Model: Meal Scan History

**Feature**: 002-meal-scan-history

---

## Existing Collection: `meals`

### Current Shape

```
{
  _id:         ObjectId,
  userId:      ObjectId,          // FK → users._id
  recordedAt:  ISODate,           // Server timestamp at scan time
  items: [
    {
      name:      string,           // "Grilled Chicken"
      quantity:  string,           // "150g"
      nutrition: {
        calories_kcal:    number,
        protein_g:        number,
        fat_g:            number,
        carbohydrates_g:  number,
        fiber_g:          number,
        sugar_g:          number
      }
    }
  ],
  totals: {
    calories_kcal:    number,
    protein_g:        number,
    fat_g:            number,
    carbohydrates_g:  number,
    fiber_g:          number,
    sugar_g:          number
  }
}
```

### Changes for Feature 002

Two new fields are added to each meal document at insert time:

| Field           | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `mealName`      | string | Yes      | Short descriptive name (2–4 words) derived from recognized items. E.g., "Steak with Vegetables", "Breakfast Bowl". |
| `imageThumbnail`| string | Yes      | Base64 data URL of the scanned meal image (e.g., `data:image/jpeg;base64,...`). Used directly as `<img src>` in the frontend. |

### Updated Shape

```
{
  _id:              ObjectId,
  userId:           ObjectId,
  recordedAt:       ISODate,
  mealName:         string,         // NEW
  imageThumbnail:   string,         // NEW — base64 data URL
  items: [ ... ],
  totals: { ... }
}
```

### Short Name Derivation Rule

Computed inside `meal_agent.js` from the items returned by `food_recogniser.js`:

- **1 item**: use `items[0].name` as-is (e.g., `"Apple"`)
- **2+ items**: `"{items[0].name} with {items[1].name}"` (e.g., `"Steak with Vegetables"`)

The name is capped at 4 words by construction; no truncation is needed for standard item names.

---

## No Schema Migration Required

Feature 002 only adds new fields to documents inserted going forward. Existing documents already in MongoDB lack `mealName` and `imageThumbnail`. These will be absent when fetched via the history endpoint — the frontend MUST handle the absence gracefully:
- Missing `mealName` → display `"Unnamed Meal"` as fallback.
- Missing `imageThumbnail` → display a placeholder icon.

---

## No New Collections

No additional collections are introduced. All history data is served from the existing `meals` collection.

---

## Indexes

The existing index `{ userId: 1 }` on the `meals` collection already covers the history query (filter by `userId`, sort by `recordedAt`). No new indexes are required.
