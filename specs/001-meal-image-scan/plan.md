# Implementation Plan: Meal Image Scan

**Branch**: `001-meal-image-scan` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-meal-image-scan/spec.md`

## Summary

Add a "Scan Meal" action to the dashboard that lets a logged-in user select a meal photo, preview it, and submit it to the server. The server accepts the image via multipart upload and returns a static placeholder response shaped like the future real AI analysis. The goal is a fully working end-to-end UI cycle for early feedback — no real image recognition, no database persistence.

---

## Technical Context

**Language/Version**: Node.js 20 (ESM, `"type": "module"`) + Vanilla JS (ES Modules, no build step)
**Primary Dependencies**: Hono 4 + `@hono/node-server` (static serving + multipart parsing built-in); Vitest 4 (tests); jsdom (frontend tests)
**Storage**: N/A for this feature — no data persisted
**Testing**: Vitest 4; jsdom for frontend; mongodb-memory-server for backend route tests (server setup requires DB)
**Target Platform**: Web browser (modern, ES2020+) + Node.js server
**Project Type**: Web service + static web app
**Performance Goals**: Upload completes and response is displayed within standard browser/connection expectations (no special targets for this UI cycle iteration)
**Constraints**: All routes protected by `requireAuth`; no new npm dependencies; no build step for frontend; ESM modules throughout
**Scale/Scope**: Single-user personal tool; single image per submission; 10 MB file size limit

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security by Default | ✅ PASS | `POST /meals/scan-and-record` already protected by `requireAuth` middleware. No new unguarded routes introduced. |
| II. API-First | ✅ PASS | Existing stub route extended. Consistent JSON response. Route registered via existing pattern in `src/server.js`. |
| III. Test-First | ✅ PASS | Tests required for both the server route (`src/routes/meals.test.js`) and the frontend module (`tests/public/meal-scan.test.js`) before implementation. |
| IV. AI-Augmented Nutrition | ✅ PASS | Dummy response shape mirrors future AI output from `calories_counter.js`. No raw LLM strings. AI integration is explicitly out of scope for this iteration. |
| V. Simplicity (YAGNI) | ✅ PASS | No new abstractions. Extends existing route file. New frontend module is single-purpose. Zero new npm dependencies. |

**Post-design re-check**: All principles still satisfied. No violations to record.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-image-scan/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── meal-scan-api.md ← Phase 1 output
└── tasks.md             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code Changes

```text
public/
├── dashboard.html               ← Add scan UI elements (button, picker, preview, result)
├── js/
│   ├── dashboard.js             ← Import and initialise meal-scan module
│   └── meal-scan.js             ← NEW: scan flow (picker, preview, fetch upload, display)

src/
└── routes/
    ├── meals.js                 ← Extend existing stub: parse multipart, validate, return dummy JSON
    └── meals.test.js            ← NEW (co-located): tests for the updated endpoint

tests/
└── public/
    └── meal-scan.test.js        ← NEW: frontend unit tests for meal-scan.js
```

**Structure Decision**: Single project layout (Option 1). Frontend is static files under `public/`; backend is Hono routes under `src/routes/`. This is unchanged from the existing project structure.

---

## Implementation Phases

### Phase 1: Server-Side Endpoint

**Goal**: Extend `POST /meals/scan-and-record` to accept a multipart image upload and return the dummy meal response.

**Tasks**:
1. Write failing tests in `src/routes/meals.test.js`:
   - Missing `image` field → 400
   - File exceeds 10 MB → 413
   - Valid image upload → 200 with dummy response shape
   - No auth token → 401
2. Update `src/routes/meals.js`:
   - Call `c.req.parseBody()` to extract the `image` field
   - Validate presence and MIME type
   - Validate file size (≤ 10 MB)
   - Return the static dummy JSON response

**Acceptance**: `npm test` green; `curl` with a real image returns the dummy response.

---

### Phase 2: Frontend Scan Module

**Goal**: Implement `public/js/meal-scan.js` with the full scan flow.

**Tasks**:
1. Write failing tests in `tests/public/meal-scan.test.js`:
   - Clicking "Scan Meal" triggers file picker
   - File selection shows preview
   - Cancel returns to idle state
   - Submit posts to `/meals/scan-and-record` and shows result
   - Network error shows error message
   - File over 10 MB shows size error before network call
2. Implement `public/js/meal-scan.js`:
   - Export `initMealScan(containerEl)` — mounts all UI into a provided container element
   - Hidden `<input type="file" accept="image/*">`
   - Preview via `URL.createObjectURL()`
   - Upload via `fetch` + `FormData` with `Authorization: Bearer` header (uses `getStoredToken()` from `auth.js`)
   - Loading indicator during upload
   - Result display (meal name + items table + totals)
   - Error state with retry button

**Acceptance**: All frontend tests green.

---

### Phase 3: Dashboard Integration

**Goal**: Wire `meal-scan.js` into `dashboard.html` and `dashboard.js`.

**Tasks**:
1. Add a scan section to `public/dashboard.html`:
   - "Scan Meal" button (visible on dashboard)
   - Container `<div id="meal-scan">` where the module mounts its UI
2. Update `public/js/dashboard.js`:
   - Import `initMealScan` from `./meal-scan.js`
   - Call `initMealScan(document.getElementById('meal-scan'))` after auth check passes

**Acceptance**: Manual browser walkthrough — full cycle works end to end; all unit tests still green.

---

## Complexity Tracking

*No constitution violations — table not required.*
