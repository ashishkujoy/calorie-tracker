# Auth Implementation Tasks

Implementation order: Tasks 1 and 3 can start in parallel. Task 4 depends on 1, 2, 3. Task 5 depends on 2, 3, 4. Task 6 depends on 3. Task 7 depends on 1, 6.

| # | Task | Depends on |
|---|------|------------|
| 1 | Set up Hono server with MongoDB connection | — |
| 2 | Create User and RefreshToken MongoDB models | #1 |
| 3 | Build JWT sign and verify utilities | — |
| 4 | Implement Google OAuth routes | #1, #2, #3 |
| 5 | Implement refresh and logout routes | #2, #3, #4 |
| 6 | Implement requireAuth middleware | #3 |
| 7 | Scaffold protected meal and stats routes | #1, #6 |

---

## Task 1 — Set up Hono server with MongoDB connection

Bootstrap the Hono HTTP server and establish a MongoDB connection. This is the foundation all auth routes will build on.

**What to build:**
- `src/server.js` — factory function `createApp(db)` that accepts a db instance and returns a configured Hono app; stores db on Hono's app context so all routes can access it via `ctx.get('db')`
- `src/db.js` — connects to MongoDB using `MONGODB_URI` from env, exports `connectDb()` which returns the db instance
- `src/index.js` — entry point: calls `connectDb()`, passes db into `createApp(db)`, then starts the server
- `src/lib/logger.js` — structured logger (use `pino`) exported as a singleton; used throughout the app for all log output
- `.env.example` with all required env vars from the spec

**Constraints:**
- Reuse the existing `dotenv` setup pattern from `src/agent.js`
- No extra middleware beyond what Hono provides out of the box
- DB connection should be a singleton — connected once in `index.js`, injected everywhere else
- No `console.log` anywhere — all output goes through the logger
- `createApp` must not call `connectDb` internally — db is always injected, making the app fully testable without a real MongoDB

**Logging:**
- Use `pino` for structured JSON logging
- Log levels: `info` for server start and incoming requests, `warn` for handled errors (e.g. 400/401), `error` for unexpected failures
- Request logging via `hono-pino` or a simple Hono middleware that logs method, path, status, and duration
- Logger exported from `src/lib/logger.js` and imported wherever needed

**Acceptance Criteria:**
- [x] Server starts and listens on `PORT` from env (default 3000)
- [x] `GET /health` returns `200 { status: "ok" }`
- [x] Server fails fast with a clear error log if `MONGODB_URI` is missing or connection fails
- [x] `db` instance is accessible in route handlers via `ctx.get('db')`
- [x] All log output is structured JSON via pino — no bare `console.log` calls
- [x] Request logs include method, path, status code, and response time
- [x] `.env.example` contains all vars: `MONGODB_URI`, `PORT`, `JWT_SECRET`, `JWT_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`
- [x] App test (`src/server.test.js`) uses `mongodb-memory-server` to create a real in-memory db, passes it to `createApp(db)`, and verifies:
  - [x] `GET /health` → `200 { status: "ok" }`
  - Any unknown route → `404`
  - `ctx.get('db')` is the injected db instance (verified via a test-only route or by asserting health check uses it cleanly)

---

## Task 2 — Create User and RefreshToken MongoDB models

Define the two MongoDB collections from the spec: `users` and `refreshTokens`.

**What to build:**
- `src/models/user.js` — exports functions to find/upsert a user by `googleId` or `email`
- `src/models/refreshToken.js` — exports functions to create, find by hash, and delete refresh tokens

**Schema — users:**
```
{ googleId, email, name, avatarUrl, createdAt, updatedAt }
```

**Schema — refreshTokens:**
```
{ userId, token (SHA-256 hash), expiresAt, createdAt }
```

**Constraints:**
- No ODM (Mongoose) — use the native MongoDB driver directly, consistent with the lightweight stack
- Unique indexes on `users.googleId` and `users.email`
- TTL index on `refreshTokens.expiresAt` so MongoDB auto-purges expired tokens
- Models export plain functions, not classes

**Acceptance Criteria:**
- [x] `upsertUser({ googleId, email, name, avatarUrl })` creates or updates a user, returns the user doc
- [x] `findUserById(id)` returns user or null
- [x] `createRefreshToken({ userId, token, expiresAt })` stores a hashed token
- [x] `findRefreshToken(rawToken)` finds by SHA-256 hash, returns doc or null
- [x] `deleteRefreshToken(rawToken)` removes by hash
- [x] Indexes created on first connection (called from `src/db.js`)
- [x] Tests: each model function with a real in-memory MongoDB (use `mongodb-memory-server`)

---

## Task 3 — Build JWT sign and verify utilities

Thin utility module for issuing and verifying JWTs and generating refresh tokens.

**What to build:**
- `src/lib/jwt.js` — exports `signAccessToken(user)`, `verifyAccessToken(token)`, `generateRefreshToken()`

**Details:**
- `signAccessToken({ id, email, name })` → signed JWT with payload `{ sub, email, name }`, expiry from `JWT_EXPIRY` env
- `verifyAccessToken(token)` → returns decoded payload or throws
- `generateRefreshToken()` → returns a cryptographically random string (use `crypto.randomBytes`)
- SHA-256 hashing helper (used by models): `hashToken(rawToken)` → hex string

**Constraints:**
- Use `jose` or `jsonwebtoken` — pick whichever is lighter; do not add both
- No business logic here — pure functions only

**Acceptance Criteria:**
- [x] `signAccessToken` produces a verifiable JWT with correct `sub`, `email`, `name` claims
- [x] `verifyAccessToken` throws on expired tokens, wrong signature, and malformed input
- [x] `generateRefreshToken` returns a string of sufficient entropy (≥ 32 bytes)
- [x] `hashToken` is deterministic — same input always produces same output
- [x] Tests: sign→verify roundtrip, expired token rejection, tampered token rejection

---

## Task 4 — Implement Google OAuth routes

Implement the two Google OAuth endpoints: the redirect initiator and the callback handler.

**What to build:**
- `src/routes/auth.js` — Hono router with `GET /auth/google` and `GET /auth/google/callback`
- Mount the router in `src/server.js`

**`GET /auth/google`:**
1. Generate a random `state` token, store in a short-lived signed cookie
2. Build the Google authorization URL with scopes `openid email profile`
3. Redirect browser to Google

**`GET /auth/google/callback`:**
1. Validate `state` cookie matches query param — return `400` on mismatch
2. Exchange `code` for tokens via `https://oauth2.googleapis.com/token`
3. Decode the `id_token` (verify with Google's public keys or use `google-auth-library`)
4. Call `upsertUser` with `{ googleId: sub, email, name, picture }`
5. Call `signAccessToken` and `generateRefreshToken`
6. Store hashed refresh token via `createRefreshToken`
7. Set `refreshToken` as `httpOnly; Secure; SameSite=Strict` cookie
8. Redirect to `FRONTEND_URL/#token=<accessToken>`

**Constraints:**
- Fetch Google token endpoint using native `fetch` (Node 18+), no extra HTTP client
- Use `google-auth-library` only for `id_token` verification — not for the full OAuth flow

**Acceptance Criteria:**
- [ ] `GET /auth/google` redirects to Google with correct `client_id`, `scope`, `state`, `redirect_uri`
- [ ] Callback with valid `code` creates/updates user in DB and redirects to frontend with access token
- [ ] Callback with mismatched `state` returns `400`
- [ ] Callback with Google error query param returns `400`
- [ ] New user is created on first login; existing user is updated on subsequent logins
- [ ] Refresh token cookie is `httpOnly`, `Secure`, `SameSite=Strict`
- [ ] Tests: mock Google token exchange; test state mismatch, happy path new user, happy path returning user

---

## Task 5 — Implement refresh and logout routes

Implement token rotation (refresh) and session termination (logout).

**What to build:**
- Add `POST /auth/refresh` and `POST /auth/logout` to `src/routes/auth.js`

**`POST /auth/refresh`:**
1. Read `refreshToken` from `httpOnly` cookie
2. Look up hashed token in DB — return `401` if not found or expired
3. Delete the old refresh token (rotation)
4. Issue new access token + new refresh token
5. Store new hashed refresh token in DB
6. Set new `refreshToken` cookie
7. Return `{ accessToken }`

**`POST /auth/logout`:**
1. Read `refreshToken` from cookie
2. Delete from DB (no error if not found — idempotent)
3. Clear the cookie
4. Return `204`

**Constraints:**
- Reuse `generateRefreshToken`, `hashToken`, `signAccessToken` from `src/lib/jwt.js`
- Reuse `findRefreshToken`, `deleteRefreshToken`, `createRefreshToken` from the model

**Acceptance Criteria:**
- [ ] `/auth/refresh` with valid token returns new `accessToken` and rotates refresh token cookie
- [ ] `/auth/refresh` with expired or unknown token returns `401`
- [ ] `/auth/refresh` with no cookie returns `401`
- [ ] `/auth/logout` deletes token and clears cookie regardless of whether token exists
- [ ] Old refresh token is unusable after rotation
- [ ] Tests: refresh happy path, expired token, missing token, logout idempotency

---

## Task 6 — Implement requireAuth middleware

A Hono middleware that protects routes by validating the JWT access token.

**What to build:**
- `src/middleware/requireAuth.js` — exports a Hono middleware function

**Logic:**
1. Extract `Authorization` header, expect `Bearer <token>` format
2. Call `verifyAccessToken(token)` from `src/lib/jwt.js`
3. On success: set `ctx.set('user', { id, email, name })` and call `next()`
4. On failure (missing header, invalid token, expired): return `401 { error: 'Unauthorized' }`

**Constraints:**
- No DB call — access token is stateless by design
- Single responsibility: only validates the token, nothing else

**Acceptance Criteria:**
- [ ] Valid JWT passes through and `ctx.get('user')` is populated downstream
- [ ] Missing `Authorization` header → `401`
- [ ] Malformed header (no `Bearer` prefix) → `401`
- [ ] Expired token → `401`
- [ ] Tampered/invalid signature → `401`
- [ ] Tests: all five cases above using a test Hono app with a dummy protected route

---

## Task 7 — Scaffold protected meal and stats routes

Wire up the `requireAuth` middleware to `/meals/*` and `/stats/*` route groups and add stub handlers so the auth layer can be verified end-to-end.

**What to build:**
- `src/routes/meals.js` — Hono router, all routes protected by `requireAuth`, stub handlers
- `src/routes/stats.js` — Hono router, all routes protected by `requireAuth`, stub handlers
- Mount both in `src/server.js`

**Stub endpoints (enough to verify auth is working):**
- `GET /meals` → `200 { meals: [] }`
- `POST /meals` → `201 { meal: null }`
- `GET /stats/daily` → `200 { stats: null }`

**Constraints:**
- No business logic yet — stubs only
- `requireAuth` applied at the router level, not per-route
- Each handler should read `ctx.get('user')` and include `userId` in the response so the middleware wiring is verifiable

**Acceptance Criteria:**
- [ ] All `/meals/*` and `/stats/*` routes return `401` without a valid JWT
- [ ] All routes return their stub response with a valid JWT
- [ ] `userId` from the JWT is accessible inside every handler
- [ ] Tests: unauthenticated request to each route, authenticated request to each route
