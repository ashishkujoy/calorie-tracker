# API Contracts: Meals — History & Delete

**Feature**: 002-meal-scan-history
**Base path**: `/meals`
**Auth**: All endpoints require `Authorization: Bearer <access_token>` header. Requests without a valid token receive `401 Unauthorized`.

---

## Existing Endpoint Change: POST /meals/scan-and-record

No breaking changes to the existing contract. Two fields are **added** to the response and stored in MongoDB:

### Request
Unchanged — multipart FormData with `image` field.

### Response (updated)
```json
{
  "meal": {
    "mealName": "Steak with Vegetables",
    "imageThumbnail": "data:image/jpeg;base64,/9j/4AAQ...",
    "items": [
      {
        "name": "Steak",
        "quantity": "200g",
        "nutrition": {
          "calories_kcal": 400,
          "protein_g": 40,
          "fat_g": 20,
          "carbohydrates_g": 5,
          "fiber_g": 0,
          "sugar_g": 0
        }
      }
    ],
    "totals": {
      "calories_kcal": 620,
      "protein_g": 48,
      "fat_g": 38,
      "carbohydrates_g": 22,
      "fiber_g": 2,
      "sugar_g": 1
    }
  }
}
```

---

## New Endpoint: GET /meals/history

Retrieves all meal scans for the authenticated user, sorted newest first.

### Request

```
GET /meals/history
Authorization: Bearer <access_token>
```

No query parameters.

### Success Response — `200 OK`

```json
{
  "meals": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "mealName": "Steak with Vegetables",
      "imageThumbnail": "data:image/jpeg;base64,/9j/4AAQ...",
      "recordedAt": "2026-03-12T12:51:00.000Z",
      "totals": {
        "calories_kcal": 620,
        "protein_g": 48,
        "fat_g": 38,
        "carbohydrates_g": 22,
        "fiber_g": 2,
        "sugar_g": 1
      }
    }
  ]
}
```

**Field notes:**
- `id` — string representation of the MongoDB `_id` (used for delete)
- `mealName` — may be absent on old documents; frontend displays `"Unnamed Meal"` fallback
- `imageThumbnail` — may be absent on old documents; frontend displays placeholder icon
- `recordedAt` — ISO 8601 UTC string
- `totals` — nutrition summary; individual `items` are not returned in the history list (not needed by UI)

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `401`  | `{ "error": "Unauthorized" }` | Missing or invalid Bearer token |
| `500`  | `{ "error": "Internal server error" }` | Database failure |

---

## New Endpoint: DELETE /meals/:id

Deletes a specific meal scan belonging to the authenticated user.

### Request

```
DELETE /meals/:id
Authorization: Bearer <access_token>
```

- `:id` — the `id` string returned by `GET /meals/history`

### Success Response — `200 OK`

```json
{ "deleted": true }
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `401`  | `{ "error": "Unauthorized" }` | Missing or invalid Bearer token |
| `404`  | `{ "error": "Meal not found" }` | No meal with this `id` belonging to the authenticated user |
| `400`  | `{ "error": "Invalid meal id" }` | `:id` is not a valid MongoDB ObjectId |
| `500`  | `{ "error": "Internal server error" }` | Database failure |

**Security**: The delete query filters by both `_id` and `userId` — a user cannot delete another user's meals even if they know the ID.
