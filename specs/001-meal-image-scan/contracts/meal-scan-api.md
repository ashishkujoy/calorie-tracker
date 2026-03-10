# API Contract: Meal Image Scan

**Feature**: 001-meal-image-scan
**Date**: 2026-03-10
**Base path**: `/meals`

---

## POST /meals/scan-and-record

Upload a meal image. The server accepts the image and returns a placeholder meal analysis response. In this iteration, no data is persisted and no real image recognition is performed.

### Authentication

Required. Caller must include a valid access token:

```
Authorization: Bearer <access_token>
```

Returns `401 Unauthorized` if the token is missing, expired, or invalid.

### Request

**Content-Type**: `multipart/form-data`

| Field  | Type | Required | Description                          |
|--------|------|----------|--------------------------------------|
| image  | File | Yes      | Meal photo. Accepted MIME: `image/*`. Max size: 10 MB. |

**Example (curl)**:
```sh
curl -X POST http://localhost:3000/meals/scan-and-record \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/meal.jpg"
```

### Response — 200 OK

Returned when the image is received successfully.

**Content-Type**: `application/json`

```json
{
  "meal": {
    "name": "Sample Meal",
    "items": [
      {
        "name": "Grilled Chicken",
        "quantity": "150g",
        "calories_kcal": 248,
        "protein_g": 46.5,
        "fat_g": 5.4,
        "carbohydrates_g": 0.0
      }
    ],
    "totals": {
      "calories_kcal": 248,
      "protein_g": 46.5,
      "fat_g": 5.4,
      "carbohydrates_g": 0.0,
      "fiber_g": 0.0,
      "sugar_g": 0.0
    }
  }
}
```

### Response — 400 Bad Request

Returned when the `image` field is missing or the file type is not an image.

```json
{ "error": "image field is required and must be an image file" }
```

### Response — 413 Payload Too Large

Returned when the uploaded file exceeds 10 MB.

```json
{ "error": "Image exceeds the 10 MB size limit" }
```

### Response — 401 Unauthorized

Returned when no valid Bearer token is provided.

```json
{ "error": "Unauthorized" }
```

### Response — 500 Internal Server Error

Returned on unexpected server failures.

```json
{ "error": "Internal server error" }
```

---

## Stability note

This contract is marked **draft**. The response shape is intentionally designed to match the future real AI response format so that clients do not need to change when real image recognition is introduced. The request interface (`multipart/form-data`, field name `image`) is considered stable.
