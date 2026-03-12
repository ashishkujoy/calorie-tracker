# Contract: POST /meals/scan-and-record

**Version**: 1.0 | **Branch**: `001-meal-calorie-tracking` | **Date**: 2026-03-10

## Overview

Accepts a meal image from an authenticated user, analyses it using the local AI pipeline to identify food items and calculate nutrition values, persists the meal record, and returns the nutrition results to the client.

## Request

### Method & Path

```
POST /meals/scan-and-record
```

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <JWT>` | Yes |
| `Content-Type` | `multipart/form-data` | Yes (set automatically by browser FormData) |

### Body (multipart/form-data)

| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| `image` | File | MIME type must be `image/*`; max size 10 MB; supported formats: JPEG, PNG, WebP | Yes |

### Example (curl)

```bash
curl -X POST http://localhost:3000/meals/scan-and-record \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/meal.jpg"
```

---

## Responses

### 200 OK — Analysis Successful

The meal was analysed and the record was saved.

```json
{
  "meal": {
    "items": [
      {
        "name": "Grilled Chicken",
        "quantity": "150g",
        "nutrition": {
          "calories_kcal": 248,
          "protein_g": 46.5,
          "fat_g": 5.4,
          "carbohydrates_g": 0.0,
          "fiber_g": 0.0,
          "sugar_g": 0.0
        }
      },
      {
        "name": "Brown Rice",
        "quantity": "100g",
        "nutrition": {
          "calories_kcal": 123,
          "protein_g": 2.7,
          "fat_g": 1.0,
          "carbohydrates_g": 25.6,
          "fiber_g": 1.8,
          "sugar_g": 0.4
        }
      }
    ],
    "totals": {
      "calories_kcal": 371,
      "protein_g": 49.2,
      "fat_g": 6.4,
      "carbohydrates_g": 25.6,
      "fiber_g": 1.8,
      "sugar_g": 0.4
    }
  }
}
```

**Guarantees**:
- `meal.items` always has at least one element.
- `meal.totals` always contains all six nutrition fields.
- The meal record has been persisted to the database before this response is returned.

---

### 400 Bad Request — Missing or Invalid Image

```json
{ "error": "image field is required and must be an image file" }
```

---

### 401 Unauthorized — Missing or Invalid Token

```json
{ "error": "Unauthorized" }
```

---

### 413 Payload Too Large — Image Exceeds 10 MB

```json
{ "error": "Image exceeds the 10 MB size limit" }
```

---

### 422 Unprocessable Entity — Analysis Failed

Returned when the AI pipeline cannot identify any food items in the image, or when nutrition calculation fails.

```json
{ "error": "Could not identify any food items in the image. Please try again with a clearer photo." }
```

or

```json
{ "error": "Nutrition analysis failed. Please try again." }
```

**No meal record is saved when this status is returned.**

---

### 500 Internal Server Error — Unexpected Failure

```json
{ "error": "Internal server error" }
```

---

## Behaviour Notes

- The meal record is saved **atomically after** the AI pipeline completes successfully. If persistence fails, the response is 500 and no partial record is saved.
- The response shape is identical whether or not the record was persisted (the `meal` object is always the analysed result). The client does not need to take any action to trigger saving.
- The `_id` and `recordedAt` of the saved record are not returned in the response (out of scope for this iteration).
