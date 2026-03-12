# Tasks: Meal Calorie Tracking

**Input**: Design documents from `/specs/001-meal-calorie-tracking/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Included — Constitution Principle III mandates Test-First (Red-Green-Refactor) with co-located Vitest tests and in-memory MongoDB.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm existing project is ready; no new dependencies or project structure changes are required.

- [x] T001 Verify Ollama is running locally with `gemma3` and `gpt-oss` models pulled (`ollama list`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared pipeline module that both user stories depend on. Must complete before any user story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create `src/meal_agent.js` — export `runMealAnalysis(imageBuffer)` that calls `createFoodRecogniser()` then `createCaloriesCounter()` sequentially; return `{ success: true, meal }` on success or `{ success: false, stage, error }` on failure

**Checkpoint**: `src/meal_agent.js` is importable; verify manually with `node src/agent.js <image-path>` to confirm the pipeline still works end-to-end.

---

## Phase 3: User Story 1 — View Nutrition After Meal Upload (Priority: P1) 🎯 MVP

**Goal**: Replace the dummy response in `POST /meals/scan-and-record` with a real AI pipeline call. Users see calories and nutrition values when they upload a meal photo.

**Independent Test**: Upload a food photo via the web UI (or curl). Confirm the response JSON contains `meal.totals.calories_kcal` and `meal.items` with at least one entry. Confirm a non-food image returns HTTP 422 with a user-facing error message.

### Tests for User Story 1

> **Write these tests FIRST — they MUST FAIL before implementation (Red phase)**

- [x] T003 [US1] Write failing test in `src/routes/meals.test.js`: `vi.mock("../meal_agent.js")` — POST valid image → mock returns `{ success: true, meal: { items: [...], totals: {...} } }` → expect HTTP 200 and `{ meal: { items, totals } }` in response body
- [x] T004 [US1] Write failing test in `src/routes/meals.test.js`: mock returns `{ success: false, stage: "recognition" }` → expect HTTP 422 and error message about unrecognised food
- [x] T005 [US1] Write failing test in `src/routes/meals.test.js`: mock returns `{ success: false, stage: "calories" }` → expect HTTP 422 and error message about failed nutrition analysis

### Implementation for User Story 1

- [x] T006 [US1] Update `src/routes/meals.js`: import `runMealAnalysis` from `../meal_agent.js`; convert Hono `File` to `Buffer` with `Buffer.from(await image.arrayBuffer())`; call `runMealAnalysis(imageBuffer)`
- [x] T007 [US1] Update `src/routes/meals.js`: replace `return ctx.json({ meal: DUMMY_MEAL })` — on `success: true` return `ctx.json({ meal: analysisResult.meal })`; on `success: false` return `ctx.json({ error: <user-facing message> }, 422)` based on `stage`; remove the `DUMMY_MEAL` constant
- [x] T008 [US1] Run `npm test` and confirm T003, T004, T005 now pass (Green phase)

**Checkpoint**: User Story 1 is fully functional. `POST /meals/scan-and-record` returns real nutrition data. HTTP 422 is returned for unrecognised food or analysis failure. Existing 400/413 tests still pass.

---

## Phase 4: User Story 2 — Meal Record Saved Automatically (Priority: P2)

**Goal**: After a successful analysis, automatically persist the meal record to MongoDB under the authenticated user's account. No additional user action required.

**Independent Test**: Upload a food photo, receive a 200 response. Query the `meals` collection in MongoDB directly (or via a test assertion on the in-memory DB) and confirm a document exists with the correct `userId`, `recordedAt`, `items`, and `totals` fields. Confirm a failed analysis produces no document.

### Tests for User Story 2

> **Write these tests FIRST — they MUST FAIL before implementation (Red phase)**

- [x] T009 [US2] Write failing test in `src/routes/meals.test.js`: use real in-memory MongoDB (`createTestDb()`); mock `meal_agent.js` to return success; POST valid image → expect HTTP 200 AND one document inserted in `db.collection("meals")` with correct `userId`, `items`, and `totals`
- [x] T010 [US2] Write failing test in `src/routes/meals.test.js`: mock `meal_agent.js` to return failure; POST valid image → expect HTTP 422 AND zero documents in `db.collection("meals")`

### Implementation for User Story 2

- [x] T011 [P] [US2] Create `src/models/meal.js`: define `nutritionSchema` and `mealRecordSchema` with Zod 4 (`z.object`, `z.array().min(1)`, `z.number().nonnegative()`); export `insertMeal(db, mealDoc)` that calls `mealRecordSchema.parse(mealDoc)` then `db.collection("meals").insertOne(validated)`
- [x] T012 [P] [US2] Update `src/db.js`: add `await db.collection("meals").createIndex({ userId: 1 })` inside `ensureIndexes()`
- [x] T013 [US2] Update `src/routes/meals.js`: import `insertMeal` from `../models/meal.js` and `ObjectId` from `mongodb`; after a successful `runMealAnalysis`, call `insertMeal(db, { userId: new ObjectId(user.id), recordedAt: new Date(), items: analysisResult.meal.items, totals: analysisResult.meal.totals })`
- [x] T014 [US2] Run `npm test` and confirm T009, T010 now pass (Green phase); confirm the full suite still passes

**Checkpoint**: User Story 2 is fully functional. Every successful analysis saves a record. Failed analyses save nothing. All previous tests remain green.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and documentation.

- [x] T015 [P] Run full test suite and linter: `npm test && npm run lint` — confirm zero failures and zero lint errors
- [x] T016 [P] Verify `.env.example` at repo root accurately reflects all required environment variables (no new vars added by this feature; confirm `MONGODB_URI` and `JWT_SECRET` are present)
- [ ] T017 Run the quickstart manual integration test from `specs/001-meal-calorie-tracking/quickstart.md` against a real Ollama instance to confirm end-to-end behaviour

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** both user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 3 completion (US2 builds on the analysis result US1 establishes; both touch `meals.js`)
- **Polish (Phase 5)**: Depends on Phase 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Phase 2 (Foundational)
- **User Story 2 (P2)**: Depends on User Story 1 — the persistence layer wraps the same route as the display layer; implementing them sequentially avoids merge conflicts in `meals.js`

### Within Each User Story

- Tests MUST be written first and MUST FAIL before implementation begins
- `meal_agent.js` must exist before `meals.js` can import it
- `meal.js` model and `db.js` index change (T011, T012) can be done in parallel
- Persistence call in `meals.js` (T013) depends on T011 and T012

### Parallel Opportunities

- T011 (`src/models/meal.js`) and T012 (`src/db.js`) are in different files with no mutual dependency — can be done in parallel
- T015 (test + lint) and T016 (`.env.example` check) are independent — can be done in parallel

---

## Parallel Example: User Story 2

```bash
# These two tasks touch different files — start them simultaneously:
Task T011: Create src/models/meal.js
Task T012: Update src/db.js (add meals index)

# Then, once both are done:
Task T013: Update src/routes/meals.js to call insertMeal()
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002) — CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T003–T008)
4. **STOP and VALIDATE**: Upload a meal photo via the UI; confirm calories and nutrition are displayed
5. Demo or ship MVP; proceed to US2 when ready

### Incremental Delivery

1. Complete Setup + Foundational → Pipeline module ready
2. Add User Story 1 → Real nutrition display works → **Demo!** (MVP)
3. Add User Story 2 → Records auto-saved to DB → Full feature complete
4. Polish → Clean, tested, lint-green code

---

## Notes

- [P] tasks operate on different files with no inter-dependencies
- Tests are co-located (`src/routes/meals.test.js`) per Constitution Principle III
- In-memory MongoDB (`mongodb-memory-server`) is used in all DB-touching tests
- Ollama calls are mocked in tests via `vi.mock("../meal_agent.js")`
- `src/agent.js` (CLI dev tool) is NOT modified — T002 creates a separate `src/meal_agent.js`
- The `meals` collection and its index are created automatically on next `npm start` via `ensureIndexes()`
- Document the new `meals` collection in your PR description (Constitution: Development Workflow)
