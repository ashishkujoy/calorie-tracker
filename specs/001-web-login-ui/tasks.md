# Tasks: Web Login UI

**Input**: Design documents from `specs/001-web-login-ui/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included — `auth.js` logic MUST have Vitest tests (Principle III, Test-First).
HTML/CSS has no automated tests; verified via manual browser testing per quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure and wire static file serving into the existing server.

- [x] T001 Create `public/css/` and `public/js/` directory structure under repo root
- [x] T002 Add `serveStatic` middleware to `src/server.js` — import from `@hono/node-server/serve-static`, register `app.use('/*', serveStatic({ root: './public' }))` before all existing route registrations

**Checkpoint**: `npm start` → `GET http://localhost:3000/` returns a 404 (no index.html yet) but does NOT fall through to a Hono route error; static middleware is active.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The `auth.js` module is shared by both user stories. Tests MUST be written and
confirmed failing before the module is implemented.

- [x] T003 Write failing Vitest tests for `public/js/auth.js` in `public/js/auth.test.js`:
  - Test: extracts JWT from `window.location.hash` when hash is `#token=<jwt>`
  - Test: stores extracted token in `sessionStorage` under key `"access_token"`
  - Test: clears hash from URL via `window.history.replaceState` without page reload
  - Test: detects `?error=` in `window.location.search` and returns error code string
  - Test: clears `?error=` from URL via `window.history.replaceState`
  - Test: reads and returns token from `sessionStorage` when no hash present
  - Test: returns `null` from `getStoredToken()` when `sessionStorage` is empty
  - Test: `isTokenExpired(jwt)` returns `true` when JWT `exp` claim is in the past
  - Test: `isTokenExpired(jwt)` returns `false` when JWT `exp` claim is in the future
  - Use `@vitest-environment jsdom` annotation at top of test file
- [x] T004 Confirm all T003 tests fail (`npm test`) — do not proceed until red

**Checkpoint**: `npm test` shows all new tests failing (red). Foundation ready for implementation.

---

## Phase 3: User Story 1 — Sign In with Google (Priority: P1) 🎯 MVP

**Goal**: Unauthenticated user visits the app, sees the login page, signs in with Google, lands
on dashboard, and session persists across page refreshes.

**Independent Test**:
1. Start server (`npm start`)
2. Visit `http://localhost:3000` — login page with "Sign in with Google" button appears
3. Click button — Google OAuth page opens
4. Complete sign-in — lands on `dashboard.html` with user name/avatar visible
5. Refresh page — stays on dashboard (no re-login prompt)
6. Open new tab at `http://localhost:3000` — redirected to dashboard silently (refresh cookie restores session)

### Tests for User Story 1 ⚠️

> **Write these FIRST, confirm they FAIL, then implement**

- [x] T005 [P] [US1] Add tests to `public/js/auth.test.js` for session restore flow:
  - Test: when `sessionStorage` has a valid (non-expired) token, `getAuthState()` returns `{ status: 'authenticated', token }`
  - Test: when `sessionStorage` is empty and `POST /auth/refresh` returns `{ accessToken }`, stores token and returns `{ status: 'authenticated', token }`
  - Test: when `sessionStorage` is empty and `POST /auth/refresh` returns 401, returns `{ status: 'unauthenticated' }`
  - Mock `fetch` for the refresh call using `vi.fn()`

### Implementation for User Story 1

- [x] T006 [US1] Implement `public/js/auth.js` module to make all T003 and T005 tests pass:
  - Export `extractTokenFromHash()` — reads `window.location.hash`, stores in `sessionStorage`, clears hash
  - Export `extractErrorFromSearch()` — reads `window.location.search`, returns error code, clears param
  - Export `getStoredToken()` — reads `sessionStorage["access_token"]`, returns token or `null`
  - Export `isTokenExpired(token)` — decodes JWT payload (base64), checks `exp` vs `Date.now()`
  - Export `storeToken(token)` — writes to `sessionStorage["access_token"]`
  - Export `clearToken()` — removes `sessionStorage["access_token"]`
  - Export `refreshSession()` — calls `POST /auth/refresh`, on success stores and returns token, on failure returns `null`
  - Export `getAuthState()` — orchestrates the full page-load flow (hash → stored token → refresh → unauthenticated)
- [x] T007 [US1] Confirm `npm test` passes (all tests green)
- [x] T008 [P] [US1] Create `public/index.html` — login page shell:
  - On `<script type="module">`: import `auth.js`, call `getAuthState()`, if authenticated redirect to `/dashboard.html`, else show login UI
  - Login UI: app name/logo, "Sign in with Google" `<a>` button linking to `/auth/google`, loading state when button is clicked (`disabled` + spinner)
  - Responsive layout (375 px – 1440 px): centered card, no horizontal scroll
  - Link to `public/css/style.css`
- [x] T009 [P] [US1] Create `public/css/style.css` — minimalist styles:
  - Full-viewport centered flex layout for login card
  - Google sign-in button styled per Google brand guidelines (white background, Google logo, appropriate padding)
  - Loading spinner (CSS-only) shown when `data-loading` attribute is set on the button
  - Responsive: card width `min(400px, 90vw)`
  - No external fonts or CDN resources (system font stack only)
- [x] T010 [P] [US1] Create `public/dashboard.html` — post-login placeholder:
  - On `<script type="module">`: import `auth.js`, call `getAuthState()`, if unauthenticated redirect to `/`
  - Display user name decoded from JWT payload (`getStoredToken()` → decode → show `name` field)
  - Single "You're logged in" heading and user name/email — no further functionality

**Checkpoint**: US1 independently testable — follow manual steps in Independent Test above.

---

## Phase 4: User Story 2 — Graceful Authentication Error Handling (Priority: P2)

**Goal**: When OAuth fails or is cancelled, the user returns to the login page with a
human-readable message and a working "Sign in with Google" button.

**Independent Test**:
1. Start server, visit `http://localhost:3000`
2. Click "Sign in with Google", then click "Cancel" on the Google consent screen
3. Login page reappears with message: "Sign-in was cancelled. Please try again."
4. "Sign in with Google" button is visible and clickable
5. No raw error codes, JSON, or stack traces are shown

### Tests for User Story 2 ⚠️

> **Write these FIRST, confirm they FAIL, then implement**

- [x] T011 [P] [US2] Add tests to `public/js/auth.test.js` for error display:
  - Test: `extractErrorFromSearch()` with `?error=access_denied` returns `'access_denied'`
  - Test: `extractErrorFromSearch()` with `?error=server_error` returns `'server_error'`
  - Test: `extractErrorFromSearch()` with no `?error=` returns `null`
  - Test: `getErrorMessage('access_denied')` returns the string `"Sign-in was cancelled. Please try again."`
  - Test: `getErrorMessage('server_error')` returns a non-empty, non-technical string
  - Test: `getErrorMessage(null)` returns `null`
- [x] T012 [US2] Confirm T011 tests fail (`npm test`) — do not proceed until red

### Implementation for User Story 2

- [x] T013 [US2] Add `getErrorMessage(code)` export to `public/js/auth.js`:
  - `'access_denied'` → `"Sign-in was cancelled. Please try again."`
  - `'server_error'` / any unrecognised code → `"Something went wrong. Please try again."`
  - `null` → `null`
- [x] T014 [US2] Update `public/index.html` to handle error display:
  - In the page-load script: call `extractErrorFromSearch()`, if non-null call `getErrorMessage()` and render error banner above the sign-in button
  - Error banner: visible `role="alert"` element, styled in red/warning colour, dismissed when user clicks sign-in button
- [x] T015 [US2] Update `public/css/style.css` — add error banner styles:
  - Warning colour (e.g., `#c0392b` text on light background)
  - `role="alert"` accessible styling
- [x] T016 [US2] Confirm `npm test` passes (all tests green)

**Checkpoint**: US1 and US2 both independently functional. Both manual test paths pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Add `.env.example` to repo root documenting all required environment variables
  (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `PORT`,
  `JWT_SECRET`, `MONGODB_URI`) with placeholder values
- [x] T018 [P] Verify `serveStatic` does not shadow `/health`, `/auth/*`, `/meals`, `/stats`
  routes — manual spot-check: `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [x] T019 Run full test suite (`npm test`) — confirm all tests pass including pre-existing server tests
- [ ] T020 Manual walkthrough of quickstart.md end-to-end validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002) — BLOCKS both user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion; may run concurrently with US1 if desired, but US1 establishes the `auth.js` module US2 extends
- **Polish (Phase 5)**: Depends on US1 and US2 completion

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 — independently completable and testable
- **US2 (P2)**: Extends `auth.js` and `index.html` created in US1; can only begin after US1 implementation tasks complete (T006–T010)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T003→T004 before T006; T005 before T006; T011→T012 before T013)
- `auth.js` module before HTML files (T006 before T008, T009, T010)
- Core logic before error handling extension (T006 before T013)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003 and T005 test writing can overlap
- T008 (index.html), T009 (style.css), T010 (dashboard.html) are independent files — run in parallel
- T011 (US2 tests) can be written while US1 implementation is being completed
- T017 and T018 (polish) are independent — run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# After T006 (auth.js) is complete, launch all three in parallel:
Task: "Create public/index.html login page shell"     # T008
Task: "Create public/css/style.css minimalist styles" # T009
Task: "Create public/dashboard.html placeholder"      # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational — write failing tests (T003–T004)
3. Complete Phase 3: US1 — implement auth.js, index.html, style.css, dashboard.html (T005–T010)
4. **STOP and VALIDATE**: Follow US1 Independent Test steps manually
5. `npm test` — all green

### Incremental Delivery

1. MVP complete (US1) → working login flow, session persistence ✅
2. Add US2 (error handling) → friendly failure messages ✅
3. Polish → `.env.example`, route verification, full test run ✅

### Parallel Strategy (if splitting tasks)

- **Developer A**: T001, T002, T003, T004, T006 (structure + auth.js core)
- **Developer B**: T008, T009, T010 (HTML/CSS, can begin once T006 is drafted)
- Both merge → T011–T016 (US2 error handling)

---

## Notes

- `[P]` tasks = different files, no blocking dependencies between them
- `[Story]` label maps each task to its user story for traceability
- Tests marked ⚠️ MUST fail before implementation — do not skip the red phase
- `auth.test.js` is co-located in `public/js/` per Principle III (Test-First)
- `serveStatic` registration order in `src/server.js` is critical — must precede API routes
- Commit after each checkpoint to preserve working increments
