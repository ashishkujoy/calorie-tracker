# Quickstart: Meal Calorie Tracking

**Branch**: `001-meal-calorie-tracking` | **Date**: 2026-03-10

## Prerequisites

- Node.js 20+
- MongoDB running locally or a `MONGODB_URI` pointing to a remote instance
- Ollama running locally with two models pulled:
  - `ollama pull gemma3` (food recognition)
  - `ollama pull gpt-oss` (nutrition calculation)
- `.env` file configured (see below)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. New variable for this feature:

```env
# Existing variables
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
FRONTEND_URL=http://localhost:3000
PORT=3000
JWT_SECRET=<min-32-chars>
MONGODB_URI=mongodb://localhost:27017/calorie-tracker

# Ollama (no new env vars — models are hardcoded in food_recogniser.js and calories_counter.js)
# Ensure Ollama is running on the default port: http://localhost:11434
```

## Run the Application

```bash
npm install
npm start
```

Visit `http://localhost:3000`. Log in with Google, then use the meal scan page to upload a food photo.

## Run Tests

```bash
npm test
```

All tests use an in-memory MongoDB instance — no external database required. Ollama calls are mocked in the test suite.

## Manual Integration Test

Once the server is running with Ollama available, you can test the full pipeline from the command line:

```bash
# Test the AI pipeline directly (bypasses HTTP)
node src/agent.js /path/to/meal-photo.jpg

# Test via HTTP (requires a valid JWT)
curl -X POST http://localhost:3000/meals/scan-and-record \
  -H "Authorization: Bearer <your-jwt>" \
  -F "image=@/path/to/meal-photo.jpg"
```

## Key Files Changed by This Feature

| File | Status | Purpose |
|------|--------|---------|
| `src/meal_agent.js` | **New** | Exports `runMealAnalysis(imageBuffer)` — orchestrates food recogniser + calories counter |
| `src/models/meal.js` | **New** | `insertMeal(db, mealDoc)` + Zod validation schema |
| `src/routes/meals.js` | **Updated** | Replaces dummy response with real AI pipeline call + persistence |
| `src/routes/meals.test.js` | **New** | Co-located unit + integration tests for the meals route |
| `src/db.js` | **Updated** | Adds `meals` collection index in `ensureIndexes()` |
| `src/agent.js` | **No change** | CLI dev tool — unchanged |

## Database Change

A new `meals` collection is created automatically on first run (via `ensureIndexes()` in `db.js`). No manual migration is required. Document the collection in your PR description.
