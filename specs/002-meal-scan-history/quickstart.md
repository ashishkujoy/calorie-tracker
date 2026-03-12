# Quickstart: Meal Scan History

**Feature**: 002-meal-scan-history

A developer guide covering local setup, key files to change, and manual verification steps.

---

## Prerequisites

All dependencies from prior features remain in place. No new packages are required.

```
Node.js 20+
MongoDB (local or Atlas) — or mongodb-memory-server for tests
Ollama running locally (for manual end-to-end testing of scan)
```

---

## Files Changed by This Feature

### Backend

| File | Change |
|------|--------|
| `src/meal_agent.js` | Add `mealName` derivation from recognized items; return it in the meal result |
| `src/models/meal.js` | Add `mealName` (string) and `imageThumbnail` (string) to Zod schema and `insertMeal` |
| `src/routes/meals.js` | Pass image buffer to model on scan; add `GET /history` and `DELETE /:id` routes |
| `src/routes/meals.test.js` | New tests for history and delete endpoints |

### Frontend

| File | Change |
|------|--------|
| `public/dashboard.html` | Ensure `<div id="tab-history">` exists; load `meal_history.js` |
| `public/js/meal_history.js` | Full implementation (was empty) |
| `tests/public/meal-scan.test.js` | Update scan result assertions to include `mealName` |

---

## Running Tests

```bash
npm test
```

All tests must remain green. New tests cover:
- `GET /meals/history` — returns meals sorted by `recordedAt` desc
- `GET /meals/history` — returns 401 without auth
- `DELETE /meals/:id` — deletes own meal, returns 200
- `DELETE /meals/:id` — returns 404 for another user's meal
- `DELETE /meals/:id` — returns 400 for invalid ObjectId
- `meal_agent.js` — `mealName` derived correctly for 1 and 2+ items

---

## Manual Verification Steps

1. Start the server: `node src/index.js`
2. Open `http://localhost:3000` — log in via Google
3. Scan a meal image using the Scan Meal tab
4. Switch to the History tab — the scanned meal should appear under "Today" with:
   - Short meal name
   - Scan time
   - Thumbnail
   - Calorie and macro badges
5. Scan a second meal — both appear in the "Today" group; newest first
6. Click the trash icon on one meal — it disappears immediately
7. Delete the remaining meal in the "Today" group — the entire "Today" group disappears
8. (Optional) Scan meals on different days (or temporarily adjust `recordedAt` in MongoDB) to verify multi-date grouping

---

## Environment Variables

No new environment variables are introduced by this feature. Existing `.env` values are sufficient.
