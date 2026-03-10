# Research: Web Login UI

**Feature**: `001-web-login-ui`
**Date**: 2026-03-09

## Decision 1: Access Token Storage Strategy

**Decision**: Store the JWT access token in **`sessionStorage`**, with a conditional `/auth/refresh`
call only when no valid stored token exists.

**Page-load auth flow**:
1. Check `sessionStorage` for an existing access token.
2. If present and not expired → proceed directly to the app (no network call, instant experience).
3. If absent or expired → call `POST /auth/refresh` once (silent, using the httpOnly refresh cookie).
   - If the refresh cookie is valid (up to 30 days): receive new access token → store in
     `sessionStorage` → proceed to app. User never sees the login page.
   - If the refresh cookie is missing or expired: show the login page.

**Rationale**:
- `sessionStorage` persists across page refreshes and back/forward navigation within the same browser
  tab, eliminating the `/auth/refresh` round-trip on every reload.
- The httpOnly refresh cookie (30-day TTL) restores the session transparently when the user returns
  in a new tab or new browser session — they are never forced to manually log in again as long as the
  cookie is valid.
- The access token's short lifetime limits the exposure window if `sessionStorage` were ever
  compromised via XSS. Combined with the fact that this is a personal tool with no third-party
  scripts, the risk is acceptable.

**Alternatives considered**:
- In-memory only: Token lost on every full page load → `/auth/refresh` called on every visit →
  adds unnecessary latency and is confusing UX. Rejected.
- `localStorage`: Persistent across all sessions and tabs, but readable by any script forever until
  explicitly cleared. Higher XSS risk with no benefit over `sessionStorage` for this use case.
  Rejected.

## Decision 2: Serving Static Frontend Files

**Decision**: Serve the `public/` directory as static files from the existing Hono server using
`serveStatic` middleware from `@hono/node-server/serve-static`.

**Rationale**:
- The project is a personal tool running on a single Node.js process. Adding a second server
  (nginx, caddy, separate dev server) violates Principle V (Simplicity).
- `@hono/node-server` ships `serveStatic` out of the box — zero new dependencies.
- `FRONTEND_URL` in `.env` can simply point to `http://localhost:3000` (same origin), simplifying
  CORS and cookie handling (no cross-origin cookie issues with `sameSite: Strict`).

**Alternatives considered**:
- Separate static hosting (e.g., `http-server` or nginx): Over-engineered for a personal tool,
  introduces cross-origin complexity with sameSite cookies. Rejected.
- Serving from `src/public/`: Unconventional for Node.js projects. Rejected in favour of
  top-level `public/` which is the standard for Hono and Express-style servers.

## Decision 3: URL Hash Token Extraction Pattern

**Decision**: The callback from `GET /auth/google/callback` redirects to `${FRONTEND_URL}/#token=<jwt>`.
The login page JavaScript MUST:
1. On load, check `window.location.hash` for the `#token=` prefix.
2. Extract the JWT, store it in `sessionStorage`.
3. Immediately clear the hash with `window.history.replaceState(null, '', window.location.pathname)`
   to prevent the token appearing in browser history or being logged by analytics.
4. Redirect to the main view (dashboard placeholder).

**Rationale**: Using the fragment (`#`) means the token is never sent to the server in a request
(fragments are not transmitted in HTTP requests), limiting exposure. The `replaceState` call removes
it from the URL bar without a page reload.

**Alternatives considered**:
- Query parameter (`?token=`): Would be sent in server request logs and browser history. Rejected.
- Cookie set by server, no hash: The server already does this via the httpOnly refresh cookie; the
  access token via hash is the chosen pattern already implemented in `src/routes/auth.js:128`.

## Decision 4: Frontend Test Strategy

**Decision**: The `auth.js` module (token extraction and session management logic) MUST have Vitest
unit tests using the `jsdom` environment. The HTML/CSS visual layer has no automated unit tests —
it is verified through manual browser testing.

**Rationale**:
- Vitest supports `jsdom` as a test environment (via `environment: 'jsdom'` in vitest.config settings
  or per-file `@vitest-environment jsdom` annotation). This allows testing `window.location`,
  `window.history`, and `sessionStorage` patterns without a real browser.
- Principle III (Test-First) requires tests before implementation for non-trivial behaviour. Token
  extraction and the redirect-after-auth logic are non-trivial and MUST be tested.
- Pure HTML/CSS layout correctness is not unit-testable; visual review is sufficient for a
  personal tool.

**Alternatives considered**:
- End-to-end browser tests (Playwright/Cypress): Valuable but heavyweight for a personal tool
  with a single-user audience. Out of scope for this feature; can be added later.
- No tests for frontend: Violates Principle III. Rejected.

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---------|------------|
| Token storage mechanism | `sessionStorage` (refresh via httpOnly cookie only when token absent/expired) |
| Static file serving | Hono `serveStatic` from `public/` directory |
| Hash token extraction | `window.location.hash` → extract → `history.replaceState` to clear |
| Test approach | Vitest + jsdom for `auth.js` logic; visual review for HTML/CSS |
| FRONTEND_URL value | `http://localhost:3000` (same-origin, simplest) |
