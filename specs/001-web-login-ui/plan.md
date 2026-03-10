# Implementation Plan: Web Login UI

**Branch**: `001-web-login-ui` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-web-login-ui/spec.md`

## Summary

Deliver a minimal, static login page served from the existing Hono server. The page shows a
single "Sign in with Google" button, handles the OAuth callback (token in URL hash), stores
the access token in `sessionStorage`, and silently restores the session on revisit via the
existing `POST /auth/refresh` endpoint (httpOnly refresh cookie). No new backend endpoints are
required — this feature is purely frontend plus one small server.js wiring change.

## Technical Context

**Language/Version**: HTML5 / CSS3 / Vanilla JavaScript (ES Modules, no build step)
**Primary Dependencies**: `@hono/node-server/serve-static` (already installed, zero new deps)
**Storage**: `sessionStorage` (access token); httpOnly cookie (refresh token, server-managed)
**Testing**: Vitest 4 + jsdom (existing test runner; add `environment: 'jsdom'` annotation)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Static frontend page served by existing Node.js/Hono server
**Performance Goals**: Login page interactive < 2s; session restore (refresh call) < 500ms
**Constraints**: No framework, no build step, no new npm dependencies
**Scale/Scope**: Personal tool, single user

## Constitution Check

*GATE: Must pass before implementation begins. Re-checked post-design below.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security by Default | ✅ PASS | Login page is explicitly public (`/`). Access token stored in `sessionStorage`, not `localStorage`. Hash cleared immediately via `replaceState` to prevent token leakage in browser history. No secrets in frontend code. |
| II. API-First | ✅ PASS | No new API endpoints. Frontend consumes existing `/auth/google` and `/auth/refresh`. Server change is minimal: add `serveStatic` middleware to `src/server.js`. |
| III. Test-First | ✅ PASS | `public/js/auth.test.js` MUST be written first and confirmed failing before `auth.js` is implemented. Uses Vitest + `@vitest-environment jsdom` annotation. |
| IV. AI-Augmented Nutrition | N/A | Login UI has no AI involvement. |
| V. Simplicity (YAGNI) | ✅ PASS | Vanilla HTML/CSS/JS, no framework, no build tooling, no abstractions. Single `auth.js` module. |

**Post-design re-check**: All principles satisfied. No violations to record.

## Project Structure

### Documentation (this feature)

```text
specs/001-web-login-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── auth-endpoints.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
public/                     # NEW — static frontend, served by Hono
├── index.html              # Login page + OAuth callback handler
├── dashboard.html          # Post-login placeholder (redirects to /meals eventually)
├── css/
│   └── style.css           # Minimalist login styles
└── js/
    ├── auth.js             # Token extraction, sessionStorage, refresh, redirect logic
    └── auth.test.js        # Vitest unit tests (co-located per Principle III)

src/
└── server.js               # MODIFIED — add serveStatic middleware
```

**Structure Decision**: Single project layout. Frontend is a `public/` directory at the repo
root, served by the existing Hono server via `serveStatic`. This keeps the project as one
runnable unit with no separate dev server, consistent with it being a personal tool.

## Complexity Tracking

> No constitution violations. Table left empty.

---

## Phase 0: Research (complete)

See [research.md](./research.md).

All unknowns resolved:
- Token storage → `sessionStorage` + conditional `POST /auth/refresh`
- Static serving → `@hono/node-server/serve-static`, `root: './public'`
- Hash extraction → `window.location.hash` + `history.replaceState`
- Testing → Vitest + `@vitest-environment jsdom`

---

## Phase 1: Design (complete)

See:
- [data-model.md](./data-model.md) — `AuthSession` and `AuthError` client-side state
- [contracts/auth-endpoints.md](./contracts/auth-endpoints.md) — API contracts consumed by UI
- [quickstart.md](./quickstart.md) — dev setup and manual test walkthrough

### Key Design Decisions

**Session restore on page load logic** (implemented in `public/js/auth.js`):

```
On every page load:
  1. If URL hash starts with "#token=" → extract JWT, store in sessionStorage, replaceState
  2. Else if URL search contains "?error=" → set AuthError, replaceState
  3. Read token from sessionStorage
  4. If token present and not expired (check JWT exp claim) → go to dashboard
  5. Else → POST /auth/refresh
       success → store new token in sessionStorage → go to dashboard
       failure → show login page
```

**Server wiring** (one change to `src/server.js`):

```js
import { serveStatic } from '@hono/node-server/serve-static';
// Add before route registrations:
app.use('/*', serveStatic({ root: './public' }));
```

Note: `serveStatic` must be registered **before** API routes so the root `/` serves
`index.html`. API routes (`/auth`, `/meals`, `/stats`, `/health`) are more specific and
will continue to match correctly because Hono matches in registration order.

**Error handling gap in current server**: `GET /auth/google/callback` currently returns
`ctx.json({ error }, 400)` on OAuth failure rather than redirecting. The frontend cannot
intercept a JSON 400 response when the browser is doing a full-page redirect. A follow-up
task notes this and handles it gracefully by checking `window.location.search` for Google's
own `?error=` parameter (which Google appends before hitting the server callback).
