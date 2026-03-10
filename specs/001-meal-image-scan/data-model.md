# Data Model: Meal Image Scan

**Feature**: 001-meal-image-scan
**Date**: 2026-03-10

---

## Entities

### MealImageUpload *(client-side state only — not persisted in this iteration)*

Represents a single user-initiated upload action. Lives in memory on the client during the scan flow.

| Field        | Type    | Description                                               |
|--------------|---------|-----------------------------------------------------------|
| file         | File    | The image file selected by the user (JPEG, PNG, HEIC, etc.) |
| previewUrl   | string  | Temporary object URL used to render the image preview     |
| status       | enum    | `idle` \| `previewing` \| `uploading` \| `success` \| `error` |
| errorMessage | string? | Human-readable error text shown when status = `error`     |
| result       | PlaceholderMealResponse? | Server response, populated when status = `success` |

**Validation rules**:
- `file.size` MUST be ≤ 10 MB; violations surface `error` state before any network call.
- `file.type` SHOULD be an image MIME type (`image/*`); enforced by the file picker `accept` attribute.

**State transitions**:
```
idle
  └─[user selects file]──→ previewing
                              ├─[user cancels]──→ idle
                              └─[user submits]──→ uploading
                                                    ├─[server success]──→ success
                                                    └─[server/network error]──→ error
                                                                                 └─[user retries]──→ uploading
                                                                                 └─[user cancels]──→ idle
```

---

### PlaceholderMealResponse *(server response — dummy data in this iteration)*

Returned by `POST /meals/scan-and-record`. Shaped to mirror the future real AI response so the frontend display layer requires no changes when real data is introduced.

| Field             | Type    | Description                                      |
|-------------------|---------|--------------------------------------------------|
| meal.name         | string  | Display name for the detected meal               |
| meal.items        | array   | One entry per food/drink item in the meal        |
| meal.items[].name | string  | Food item name                                   |
| meal.items[].quantity | string | Human-readable quantity (e.g., "150g")       |
| meal.items[].calories_kcal | integer | Calorie count for this item             |
| meal.items[].protein_g | number | Protein in grams (1 decimal)               |
| meal.items[].fat_g | number | Fat in grams (1 decimal)                      |
| meal.items[].carbohydrates_g | number | Carbohydrates in grams (1 decimal)   |
| meal.totals       | object  | Sum of all `items` values across the whole meal  |
| meal.totals.calories_kcal | integer | Total calories                          |
| meal.totals.protein_g | number | Total protein (1 decimal)                  |
| meal.totals.fat_g | number | Total fat (1 decimal)                         |
| meal.totals.carbohydrates_g | number | Total carbohydrates (1 decimal)      |
| meal.totals.fiber_g | number | Total fiber (1 decimal)                      |
| meal.totals.sugar_g | number | Total sugar (1 decimal)                      |

**Notes**:
- All fields are present in the dummy response even though values are static.
- This shape is derived from the output of `src/calories_counter.js` to ensure forward compatibility.
- In this iteration the server does NOT persist this data to MongoDB.

---

## What is NOT in scope

- Persisting meal records to MongoDB (future feature).
- Linking the upload to a user session record (future feature).
- Real image recognition or calorie computation (future feature — handled by `src/agent.js`).
