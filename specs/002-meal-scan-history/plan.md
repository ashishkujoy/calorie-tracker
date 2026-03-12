# Implementation Plan: Meal Scan History

**Branch**: `002-meal-scan-history` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-meal-scan-history/spec.md`

## Summary

Add a meal scan history view to the CalorieSnap dashboard. Meals are stored with a short descriptive name and image thumbnail at scan time; a new `GET /meals/history` endpoint serves them sorted newest-first; a new `DELETE /meals/:id` endpoint removes individual records. The frontend groups entries by local calendar date, shows aggregate nutrition per group, and removes empty groups after deletion.

---

## Technical Context

**Language/Version**: Node.js 20 (ESM, `"type": "module"`) — backend; Vanilla JS (ES Modules, no build step) — frontend
**Primary Dependencies**: Hono 4 + `@hono/node-server`; `mongodb` driver; `jsonwebtoken`; Zod 4; Pino; Vitest 4; jsdom
**Storage**: MongoDB 7 — `meals` collection (two new fields added to existing documents going forward)
**Testing**: Vitest 4; `mongodb-memory-server` for backend route tests; jsdom for frontend unit tests
**Target Platform**: Node.js server (localhost); static HTML/JS frontend served by Hono
**Project Type**: Web service + single-page UI
**Performance Goals**: History page loads within 2 seconds (SC-001); delete reflects within 1 second (SC-003)
**Constraints**: No new npm packages; no new MongoDB collections; no breaking changes to existing API contracts
**Scale/Scope**: Single authenticated user; tens to low hundreds of meal records

---

## Constitution Check

*GATE: Must pass before implementation begins. Re-checked after Phase 1 design.*

| Principle | Check | Notes |
|-----------|-------|-------|
| **I. Security by Default** | PASS | `GET /meals/history` and `DELETE /meals/:id` are both gated by the existing `requireAuth` middleware. Delete query filters by both `_id` AND `userId` — cross-user deletion impossible. |
| **II. API-First** | PASS | All data flows through REST endpoints registered in `src/routes/meals.js` and mounted in `src/server.js`. Response shapes are stable JSON. |
| **III. Test-First** | PASS | Tests for both new routes and `mealName` derivation written before implementation. `mongodb-memory-server` used throughout. Tests co-located in `src/routes/meals.test.js`. |
| **IV. AI-Augmented Nutrition** | PASS | Short name is derived from the already-validated items array output of the LLM pipeline — not from raw LLM strings. No new agent output is persisted without going through the existing Zod-validated path. |
| **V. Simplicity (YAGNI)** | PASS | No pagination, no image resizing, no undo/trash, no new collections, no new packages. Date grouping done client-side. Short name derived programmatically from existing data. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-meal-scan-history/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions on name derivation, image storage, grouping
├── data-model.md        # Phase 1 — updated meals document shape
├── quickstart.md        # Phase 1 — setup & manual verification guide
├── contracts/
│   └── meals-api.md     # Phase 1 — GET /history and DELETE /:id contracts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── meal_agent.js          # Modified — add mealName derivation
├── models/
│   └── meal.js            # Modified — add mealName + imageThumbnail to Zod schema & insert
└── routes/
    ├── meals.js           # Modified — pass image to model; add GET /history + DELETE /:id
    └── meals.test.js      # Modified — new tests for history + delete routes

public/
├── dashboard.html         # Modified — ensure history container + script tag exists
└── js/
    └── meal_history.js    # Implemented (was empty) — date-grouped history UI

tests/
└── public/
    └── meal-scan.test.js  # Modified — update scan assertions for new mealName field
```

**Structure Decision**: Single-project layout. Backend and frontend co-exist under `src/` and `public/` respectively — unchanged from existing structure.

---

## Complexity Tracking

No constitution violations. No complexity additions required.

---

## Implementation Steps

### Step 1 — Extend `meal_agent.js` with short name derivation

In `runMealAnalysis(imagePath)`, after the recogniser and calorie counter succeed, derive `mealName`:

```
if (items.length === 1):
    mealName = items[0].name
else:
    mealName = `${items[0].name} with ${items[1].name}`
```

Return `mealName` as part of the `{ success: true, meal: { mealName, ...existingFields } }` object.

**Tests** (`src/meal_agent.js` — add unit tests or update existing mocks in `meals.test.js`):
- Single item → `mealName` equals `items[0].name`
- Multiple items → `mealName` equals `"{item0} with {item1}"`

---

### Step 2 — Update `src/models/meal.js` Zod schema

Add to the Zod insert schema:
- `mealName: z.string()` (required)
- `imageThumbnail: z.string()` (required)

Update `insertMeal(db, data)` to accept and persist these fields.

---

### Step 3 — Update `src/routes/meals.js`

**3a — POST /scan-and-record**: Read the uploaded image buffer, convert to base64 data URL, and pass `mealName` and `imageThumbnail` to `insertMeal`.

**3b — GET /meals/history**: Protected by `requireAuth`. Query the `meals` collection for `{ userId }`, project only the fields needed by the UI (`_id`, `mealName`, `imageThumbnail`, `recordedAt`, `totals`), sort by `{ recordedAt: -1 }`. Return `{ meals: [...] }` with `_id` serialised as `id` string.

**3c — DELETE /meals/:id**: Protected by `requireAuth`. Validate `:id` is a valid ObjectId (return 400 otherwise). Delete document where `{ _id: ObjectId(id), userId }`. Return 404 if `deletedCount === 0`, else `{ deleted: true }`.

**Tests** (`src/routes/meals.test.js`):
- `GET /meals/history` returns 401 without token
- `GET /meals/history` returns empty `meals` array for user with no scans
- `GET /meals/history` returns meals sorted newest first
- `DELETE /meals/:id` returns 401 without token
- `DELETE /meals/:id` returns 400 for malformed id
- `DELETE /meals/:id` returns 404 when meal belongs to different user
- `DELETE /meals/:id` returns `{ deleted: true }` and removes document

---

### Step 4 — Implement `public/js/meal_history.js`

Export `initMealHistory(container, getToken)`. Called by `dashboard.js` when the History tab is activated.

**Responsibilities:**
1. Fetch `GET /meals/history` with the user's access token.
2. If the array is empty, render an empty-state message.
3. Group meals by local calendar date (derived from `recordedAt`).
4. Sort groups newest date first; within each group, meals are already sorted newest first by the API.
5. For each group render:
   - Group header: date label ("Today" / "Yesterday" / formatted date), meal count badge, aggregate calories + macros (summed from `totals` of meals in group).
   - Each meal card: thumbnail (`imageThumbnail` or placeholder icon), `mealName` (or "Unnamed Meal"), formatted time, calorie + macro badges, trash icon button.
6. Trash icon click: `DELETE /meals/:id` → on success remove the card from DOM; if group is now empty remove the group header; update group header aggregate totals.

**Helper functions** (all `const` arrow functions per code style):
- `groupByDate(meals)` → `Map<dateKey, meals[]>`
- `formatDateLabel(dateKey)` → `"Today"` / `"Yesterday"` / `"March 10"`
- `sumTotals(meals)` → aggregate nutrition object
- `renderGroupHeader(label, count, totals)` → DOM element
- `renderMealCard(meal, onDelete)` → DOM element

---

### Step 5 — Wire up in `public/dashboard.html`

Ensure:
- `<div id="tab-history"></div>` exists as the container for the history tab.
- `<script type="module" src="/js/meal_history.js"></script>` is included.

No structural changes required if the element already exists from prior work.

---

### Step 6 — Update `public/js/dashboard.js`

Import `initMealHistory` and call it when the History tab is switched to (lazy-load on first activation to avoid fetching history on dashboard open):

```javascript
import { initMealHistory } from './meal_history.js';

// In tab-switch handler, when History tab activated:
initMealHistory(historyContainer, getToken);
```

---

## Post-Design Constitution Re-Check

All principles continue to hold after Phase 1 design:
- **Security**: Both new routes are auth-gated; delete scoped to `userId`.
- **API-First**: Contracts defined in `contracts/meals-api.md`; stable JSON shapes.
- **Test-First**: Test cases enumerated per step above; written before implementation.
- **AI Validation**: `mealName` derived from already-Zod-validated items — no raw LLM string persisted.
- **Simplicity**: No abstractions, no new packages, no pagination, no image resizing.
