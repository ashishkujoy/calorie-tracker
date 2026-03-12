# Tasks: Meal Scan History

**Input**: Design documents from `specs/002-meal-scan-history/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/meals-api.md ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: No new project setup required — all infrastructure is in place from prior features. This phase confirms the starting state.

- [x] T001 Verify `npm test` passes on branch `002-meal-scan-history` before any changes
- [x] T002 Confirm `public/js/meal_history.js` is empty and `<div id="tab-history">` exists in `public/dashboard.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the `meals` data model and agent to carry `mealName` + `imageThumbnail`. Every user story depends on these fields being present in stored documents.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Write failing tests for `mealName` derivation in `src/routes/meals.test.js`: single-item scan produces `items[0].name`; multi-item scan produces `"{item0} with {item1}"`
- [x] T004 Add `mealName` derivation logic to `src/meal_agent.js` — after calorie counter returns items, compute `mealName` (1 item → `items[0].name`; 2+ items → `"{items[0].name} with {items[1].name}"`) and include it in the returned `meal` object
- [x] T005 Extend Zod schema in `src/models/meal.js` to include `mealName: z.string()` and `imageThumbnail: z.string()`, and update `insertMeal` to persist both fields
- [x] T006 Update `src/routes/meals.js` `POST /scan-and-record` handler to: read uploaded image buffer, convert to base64 data URL (`data:image/jpeg;base64,...`), pass `mealName` and `imageThumbnail` to `insertMeal`
- [x] T007 Update existing scan tests in `src/routes/meals.test.js` to assert that the `POST /scan-and-record` response includes `meal.mealName` (non-empty string)
- [x] T008 Run `npm test` — all tests must be green before proceeding

**Checkpoint**: `meals` documents now persist `mealName` and `imageThumbnail`. User story phases can begin.

---

## Phase 3: User Story 1 — View Meal History Grouped by Date (Priority: P1) 🎯 MVP

**Goal**: Authenticated user opens the History tab and sees all their meal scans grouped by local calendar date, newest date first, with aggregate nutrition per group.

**Independent Test**: Seed two meals on different dates via `insertMeal` in a test; call `GET /meals/history`; assert response array is sorted `recordedAt` desc; open dashboard in browser, switch to History tab, verify groups appear with correct labels and aggregate totals.

### Tests for User Story 1

> **Write these tests FIRST — confirm they FAIL before implementing the route**

- [x] T009 [P] [US1] Write failing test: `GET /meals/history` returns `401` when no auth token — in `src/routes/meals.test.js`
- [x] T010 [P] [US1] Write failing test: `GET /meals/history` returns `{ meals: [] }` for authenticated user with no scans — in `src/routes/meals.test.js`
- [x] T011 [US1] Write failing test: `GET /meals/history` returns meals sorted by `recordedAt` descending, each entry has `id`, `mealName`, `imageThumbnail`, `recordedAt`, `totals` — in `src/routes/meals.test.js`

### Implementation for User Story 1

- [x] T012 [US1] Add `GET /meals/history` route to `src/routes/meals.js`: query `meals` collection filtered by `userId`, project `{ _id, mealName, imageThumbnail, recordedAt, totals }`, sort `{ recordedAt: -1 }`, return `{ meals: [...] }` with `_id` serialised as `id` string (depends on T003–T008)
- [x] T013 [US1] Implement `groupByDate(meals)` helper in `public/js/meal_history.js`: groups flat meals array by local calendar date key (`YYYY-MM-DD`); returns entries ordered newest date first
- [x] T014 [US1] Implement `formatDateLabel(dateKey)` helper in `public/js/meal_history.js`: returns `"Today"`, `"Yesterday"`, or formatted date string (e.g., `"March 10"`) based on current local date
- [x] T015 [US1] Implement `sumTotals(meals)` helper in `public/js/meal_history.js`: sums `calories_kcal`, `protein_g`, `fat_g`, `carbohydrates_g` across a meals array
- [x] T016 [US1] Implement `renderGroupHeader(label, count, totals)` in `public/js/meal_history.js`: returns a DOM element showing date label, meal count badge, aggregate cal/P/C/F
- [x] T017 [US1] Implement `initMealHistory(container, getToken)` fetch-and-render in `public/js/meal_history.js`: calls `GET /meals/history`, renders empty-state if no meals, else renders date groups via `groupByDate`, `renderGroupHeader`, and stub meal cards (depends on T013–T016)
- [x] T018 [US1] Import and call `initMealHistory` in `public/js/dashboard.js` when the History tab is activated (lazy — only on first switch); pass history container element and `getToken` function
- [x] T019 [US1] Ensure `public/dashboard.html` loads `<script type="module" src="/js/meal_history.js"></script>` and `<div id="tab-history">` exists
- [x] T020 [US1] Run `npm test` — all tests green

**Checkpoint**: History tab shows date-grouped meals with aggregate totals. User Story 1 is independently functional.

---

## Phase 4: User Story 2 — View Individual Meal Details (Priority: P2)

**Goal**: Each meal card in a date group shows the meal thumbnail, short name, scan time, and individual nutrition badges.

**Independent Test**: Scan a meal in the browser; switch to History tab; confirm the card shows thumbnail image (or placeholder icon), meal name (or "Unnamed Meal"), formatted time (e.g., "12:51 PM"), and individual cal/P/C/F badges.

### Tests for User Story 2

> **Write these tests FIRST — confirm they FAIL before implementing**

- [x] T021 [P] [US2] Write failing test: `renderMealCard` renders `mealName` text, time string, calorie badge, and macro badges — in `tests/public/meal-history.test.js` (jsdom)
- [x] T022 [P] [US2] Write failing test: `renderMealCard` renders placeholder icon when `imageThumbnail` is absent — in `tests/public/meal-history.test.js` (jsdom)

### Implementation for User Story 2

- [x] T023 [P] [US2] Implement `formatTime(isoString)` helper in `public/js/meal_history.js`: converts ISO 8601 UTC string to local time string (e.g., `"12:51 PM"`)
- [x] T024 [US2] Implement `renderMealCard(meal)` in `public/js/meal_history.js`: returns a DOM element with thumbnail (`meal.imageThumbnail` as `<img src>` or SVG placeholder icon), `meal.mealName` (fallback `"Unnamed Meal"`), formatted scan time, cal/P/C/F badges (depends on T023)
- [x] T025 [US2] Update `initMealHistory` render loop in `public/js/meal_history.js` to call `renderMealCard(meal)` for each meal in each date group (replaces stub from T017)
- [x] T026 [US2] Run `npm test` — all tests green

**Checkpoint**: Each meal card shows full details. User Stories 1 and 2 are independently functional.

---

## Phase 5: User Story 3 — Delete a Meal Scan (Priority: P3)

**Goal**: User can delete any meal card with a single click. Entry disappears immediately; group header aggregate updates; empty groups disappear.

**Independent Test**: Delete a meal via trash icon; confirm card disappears from DOM without page reload; delete last meal in a group and confirm the group header also disappears; verify meal is gone on page refresh.

### Tests for User Story 3

> **Write these tests FIRST — confirm they FAIL before implementing the route**

- [x] T027 [P] [US3] Write failing test: `DELETE /meals/:id` returns `401` without auth — in `src/routes/meals.test.js`
- [x] T028 [P] [US3] Write failing test: `DELETE /meals/:id` returns `400` for a non-ObjectId string — in `src/routes/meals.test.js`
- [x] T029 [P] [US3] Write failing test: `DELETE /meals/:id` returns `404` when meal belongs to a different user — in `src/routes/meals.test.js`
- [x] T030 [US3] Write failing test: `DELETE /meals/:id` returns `{ deleted: true }` and document is gone from DB — in `src/routes/meals.test.js`

### Implementation for User Story 3

- [x] T031 [US3] Add `DELETE /meals/:id` route to `src/routes/meals.js`: validate `:id` is a valid ObjectId (400 if not); delete where `{ _id: ObjectId(id), userId }`; return 404 if `deletedCount === 0`, else `{ deleted: true }` (depends on T027–T030)
- [x] T032 [US3] Add trash icon button to `renderMealCard` in `public/js/meal_history.js` — on click: call `DELETE /meals/:id`, on success remove the card element from the DOM
- [x] T033 [US3] After card removal in delete handler (`public/js/meal_history.js`): recompute group meal count and aggregate totals, update the group header DOM; if group is now empty remove the group header element
- [x] T034 [US3] Run `npm test` — all tests green

**Checkpoint**: All three user stories are independently functional. Full history feature is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T035 [P] Add empty-state message with visual cue (e.g., icon + "No meals scanned yet") to `public/js/meal_history.js` when `meals` array is empty
- [x] T036 [P] Add error state to `initMealHistory` in `public/js/meal_history.js`: if `GET /meals/history` fetch fails, display a user-friendly error message in the container
- [x] T037 Run full `npm test` — all checks pass (no lint script in project)
- [ ] T038 Manual end-to-end verification per `specs/002-meal-scan-history/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 2 completion; integrates with Phase 3 UI but independently testable
- **Phase 5 (US3)**: Depends on Phase 2 completion; adds to Phase 3/4 UI but independently testable
- **Phase 6 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **User Story 2 (P2)**: Can start after Phase 2 — completes the meal card UI started in US1
- **User Story 3 (P3)**: Can start after Phase 2 — adds delete capability to existing cards

### Within Each User Story

- Tests MUST be written and confirmed to FAIL before implementing the corresponding feature
- Backend route before frontend integration
- Helpers before renderers; renderers before `initMealHistory` wiring

### Parallel Opportunities

- T009, T010 can be written in parallel (different test cases, same file)
- T013, T014, T015, T016 can be written in parallel (different helper functions, same file)
- T021, T022 can be written in parallel (different test cases)
- T023, T024 are independent of T013–T016 (can be worked in parallel if US2 starts alongside US1)
- T027, T028, T029 can be written in parallel

---

## Parallel Example: User Story 1

```
# Write all failing tests for US1 together:
T009: GET /history → 401
T010: GET /history → empty array
T011: GET /history → sorted meals with correct fields

# Implement helpers in parallel:
T013: groupByDate()
T014: formatDateLabel()
T015: sumTotals()
T016: renderGroupHeader()
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — ~8 tasks)

1. Complete Phase 1 (T001–T002)
2. Complete Phase 2 (T003–T008) — foundational
3. Complete Phase 3 (T009–T020) — US1
4. **STOP and VALIDATE**: History tab shows date groups with aggregate totals
5. Demo / ship if sufficient

### Incremental Delivery

1. Phase 1 + Phase 2 → data model ready
2. + Phase 3 (US1) → grouped history view ✅ MVP
3. + Phase 4 (US2) → individual meal cards with all details ✅
4. + Phase 5 (US3) → delete capability ✅
5. + Phase 6 → polish ✅

---

## Notes

- Tests use `mongodb-memory-server` — no real DB connection in test suite (Constitution III)
- `DELETE` queries filter by both `_id` AND `userId` — cross-user deletes impossible (Constitution I)
- No new npm packages introduced anywhere in this feature
- `mealName` and `imageThumbnail` are absent in old documents — frontend must handle gracefully (`"Unnamed Meal"` / placeholder icon)
- All JS functions use `const fnName = () => { ... }` style per code style guidelines
