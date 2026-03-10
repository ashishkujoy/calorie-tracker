# Tasks: Meal Image Scan

**Input**: Design documents from `/specs/001-meal-image-scan/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included per Constitution Principle III (Test-First). Tests MUST be written and confirmed to FAIL before the corresponding implementation task is started (Red-Green-Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: Create new file stubs so all parallel workers can start editing concurrently without conflicts.

- [x] T001 Create empty ES module stub `public/js/meal-scan.js` (export placeholder `initMealScan`)
- [x] T002 [P] Create empty test file `src/routes/meals.test.js` with Vitest boilerplate and mongodb-memory-server setup (mirrors pattern in `src/server.test.js`)
- [x] T003 [P] Create empty test file `tests/public/meal-scan.test.js` with jsdom + Vitest boilerplate (mirrors pattern in `tests/public/dashboard.test.js`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No new project-level infrastructure is required — routing, auth middleware, static serving, and Vitest are all in place. The only foundational task is confirming the existing stub route is reachable and the test harness compiles before story work begins.

**⚠️ CRITICAL**: Confirm this before starting Phase 3.

- [x] T004 Run `npm test` to confirm test suite is green with the new empty stub files and no regressions

**Checkpoint**: Green baseline confirmed — user story phases can begin.

---

## Phase 3: User Story 1 — Scan Meal Image from Dashboard (Priority: P1) 🎯 MVP

**Goal**: Logged-in user can click "Scan Meal" on the dashboard, select a photo, preview it, submit it, and see the placeholder meal analysis returned by the server.

**Independent Test**: Click "Scan Meal" on the dashboard → select any image → submit → confirm the placeholder meal name and calorie totals are displayed. Full cycle must work without triggering any error state.

### Tests for User Story 1 (write first — must FAIL before implementation)

- [x] T005 [P] [US1] Write failing test in `src/routes/meals.test.js`: `POST /meals/scan-and-record` with a valid multipart `image` field and valid Bearer token returns 200 with the dummy meal JSON shape (`meal.name`, `meal.items`, `meal.totals`)
- [x] T006 [P] [US1] Write failing test in `tests/public/meal-scan.test.js`: calling `initMealScan(container)` mounts a "Scan Meal" button inside the container element
- [x] T007 [P] [US1] Write failing test in `tests/public/meal-scan.test.js`: selecting a file via the hidden input transitions state to `previewing` and shows an `<img>` preview element
- [x] T008 [P] [US1] Write failing test in `tests/public/meal-scan.test.js`: clicking submit calls `fetch` with `POST /meals/scan-and-record`, a `FormData` body containing the `image` field, and an `Authorization: Bearer` header sourced from `getStoredToken()`
- [x] T009 [P] [US1] Write failing test in `tests/public/meal-scan.test.js`: when `fetch` resolves with the dummy meal JSON, the result section renders the meal name and at least one item row

### Implementation for User Story 1

- [x] T010 [US1] Extend `src/routes/meals.js`: parse multipart body via `c.req.parseBody()`, extract `image` field, return static dummy meal JSON (shape from `contracts/meal-scan-api.md`) — tests T005 must pass
- [x] T011 [P] [US1] Implement `initMealScan(containerEl)` in `public/js/meal-scan.js`: mount hidden `<input type="file" accept="image/*">` and visible "Scan Meal" button; clicking button programmatically triggers the file input — tests T006 must pass
- [x] T012 [P] [US1] Add preview logic to `public/js/meal-scan.js`: on file selection generate `URL.createObjectURL(file)`, render `<img>` preview, show Submit and Cancel buttons — tests T007 must pass
- [x] T013 [US1] Add upload logic to `public/js/meal-scan.js`: on Submit click build `FormData`, call `fetch` with Bearer token from `getStoredToken()`, show loading indicator during in-flight request — tests T008 must pass (depends on T012)
- [x] T014 [US1] Add result display to `public/js/meal-scan.js`: on successful fetch response parse JSON and render meal name, items table, and totals row in the result section — tests T009 must pass (depends on T013)
- [x] T015 [P] [US1] Add "Scan Meal" button and `<div id="meal-scan">` container to `public/dashboard.html` in the dashboard card section
- [x] T016 [US1] Import `initMealScan` from `./meal-scan.js` in `public/js/dashboard.js` and call `initMealScan(document.getElementById('meal-scan'))` after auth check succeeds (depends on T015)

**Checkpoint**: Full happy-path scan cycle works in the browser. `npm test` is green. Demonstrate: login → dashboard → scan → see placeholder meal result.

---

## Phase 4: User Story 2 — Error Handling During Upload (Priority: P2)

**Goal**: When the upload fails (network error, oversized file, missing image field) the UI shows a clear error message and offers a retry path. The server returns structured error responses for bad requests.

**Independent Test**: Simulate a network failure during upload → confirm error message appears and "Retry" returns to the preview state. Upload a file > 10 MB → confirm the client blocks the upload with an inline size error before any network call.

*Depends on: User Story 1 complete (same files; extends existing state machine and server handler).*

### Tests for User Story 2 (write first — must FAIL before implementation)

- [x] T017 [P] [US2] Write failing test in `src/routes/meals.test.js`: `POST /meals/scan-and-record` with no `image` field returns 400 `{ "error": "image field is required and must be an image file" }`
- [x] T018 [P] [US2] Write failing test in `src/routes/meals.test.js`: `POST /meals/scan-and-record` with an `image` field whose size exceeds 10 MB returns 413 `{ "error": "Image exceeds the 10 MB size limit" }`
- [x] T019 [P] [US2] Write failing test in `tests/public/meal-scan.test.js`: when `fetch` rejects (network error), state transitions to `error`, an error message is displayed, and a "Retry" button is present
- [x] T020 [P] [US2] Write failing test in `tests/public/meal-scan.test.js`: selecting a file larger than 10 MB transitions state to `error` immediately (before any `fetch` call) with a size-limit message

### Implementation for User Story 2

- [x] T021 [US2] Add input validation to `src/routes/meals.js`: check `image` field presence and MIME type (→ 400) and file size > 10 MB (→ 413) — tests T017, T018 must pass
- [x] T022 [P] [US2] Add client-side file size guard to `public/js/meal-scan.js`: on file selection check `file.size > 10 * 1024 * 1024` and immediately transition to `error` state with size-limit message — test T020 must pass
- [x] T023 [US2] Add error state rendering to `public/js/meal-scan.js`: on fetch rejection or non-2xx response display error message and "Retry" button that returns to `previewing` state — test T019 must pass (depends on T022)

**Checkpoint**: Error states are reachable and display correctly. `npm test` is green. Demonstrate: oversized file blocked client-side; network failure shows retry path.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T024 Run `npm test && npm run lint` and confirm fully green
- [ ] T025 [P] Manual walkthrough using `specs/001-meal-image-scan/quickstart.md`: complete happy-path cycle end to end in the browser
- [ ] T026 [P] Manual walkthrough of all error scenarios: oversized file, cancel before submit, retry after network error
- [x] T027 [P] Revoke preview object URL via `URL.revokeObjectURL()` in `public/js/meal-scan.js` after upload completes or is cancelled (memory hygiene)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002 and T003 can run in parallel with T001
- **Foundational (Phase 2)**: Depends on Phase 1 completion (T004 needs the stub files)
- **User Story 1 (Phase 3)**: Depends on Phase 2 green baseline
  - Tests (T005–T009) can all run in parallel
  - Implementation: T011, T012, T015 can start in parallel; T013 depends on T012; T014 depends on T013; T016 depends on T015
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (same files, extends state machine)
  - Tests (T017–T020) can all run in parallel
  - T021 is independent of T022; T023 depends on T022
- **Polish (Phase 5)**: Depends on Phase 4 completion; T025, T026, T027 can run in parallel

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational phase — no dependency on US2
- **US2 (P2)**: Depends on US1 completion — extends the same state machine and route handler

### Within Each User Story

1. All test tasks for the story written and confirmed FAILING
2. Server tasks (T010, T021) and frontend tasks (T011/T012, T015) can proceed in parallel
3. Sequential within frontend: mount → preview → upload → result display
4. Integration (T016) last — ties frontend module into dashboard

---

## Parallel Example: User Story 1

```bash
# Write all US1 failing tests in parallel (all different test cases in two files):
Task T005: POST /meals/scan-and-record happy path test in src/routes/meals.test.js
Task T006: initMealScan mounts button test in tests/public/meal-scan.test.js
Task T007: file selection → preview test in tests/public/meal-scan.test.js
Task T008: submit → fetch call test in tests/public/meal-scan.test.js
Task T009: fetch success → render result test in tests/public/meal-scan.test.js

# After tests fail, implement in parallel where possible:
Task T010: extend src/routes/meals.js
Task T011: mount button in public/js/meal-scan.js
Task T015: add container div to public/dashboard.html
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Create file stubs
2. Complete Phase 2: Confirm green baseline
3. Complete Phase 3: Full happy-path scan cycle
4. **STOP and VALIDATE**: End-to-end browser walkthrough
5. Demo to stakeholders for early UI feedback ← primary goal of this feature

### Incremental Delivery

1. Phase 1 + 2 → Baseline ready
2. Phase 3 (US1) → **MVP: working scan cycle** → Demo!
3. Phase 4 (US2) → Error states polished → Second demo
4. Phase 5 → Shipped

---

## Notes

- [P] tasks = different files or independent test cases, no blocking dependencies
- [Story] label maps task to specific user story for traceability
- Constitution Principle III requires tests to FAIL before implementation in each pair
- `URL.createObjectURL()` requires jsdom environment — already configured in `vitest.config.js`
- `getStoredToken()` from `public/js/auth.js` must be mocked in frontend tests (follow pattern in `tests/public/dashboard.test.js`)
- Commit after each checkpoint (Phase 3 and Phase 4 completions at minimum)
