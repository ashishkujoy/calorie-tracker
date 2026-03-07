# Auth Spec: Calorie Tracker

## Overview

Google OAuth 2.0 for authentication. On successful OAuth, the server issues its own JWT (access + refresh tokens) — Google tokens never leave the backend.

---

## Flow

```
Browser                    Hono Backend               Google
  |                              |                       |
  |-- GET /auth/google --------->|                       |
  |                              |-- redirect to Google ->|
  |<----- redirect to Google ----|                       |
  |                                                      |
  |------- user logs in with Google ------------------->|
  |<----- redirect to /auth/google/callback?code=... ---|
  |                              |                       |
  |-- GET /auth/google/callback->|                       |
  |                              |-- exchange code ----->|
  |                              |<-- id_token, profile -|
  |                              |                       |
  |                              | upsert user in DB     |
  |                              | issue JWT + refresh   |
  |<-- redirect to frontend  ----|                       |
  |   (accessToken in URL hash,  |                       |
  |    refreshToken in httpOnly  |                       |
  |    cookie)                   |                       |
```

---

## Data Model

### `users` collection (MongoDB)

```
{
  _id: ObjectId,
  googleId: string (unique),
  email: string (unique, from Google profile),
  name: string,
  avatarUrl: string,
  createdAt: Date,
  updatedAt: Date
}
```

No password field — identity is fully delegated to Google.

### `refreshTokens` collection (MongoDB)

```
{
  _id: ObjectId,
  userId: ObjectId,
  token: string (SHA-256 hash of the actual token),
  expiresAt: Date,
  createdAt: Date
}
```

---

## API Endpoints

### Public routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/google` | Redirect to Google OAuth consent screen |
| GET | `/auth/google/callback` | Handle OAuth callback, issue tokens |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Protected routes

All `/meals/*` and `/stats/*` routes require a valid JWT.

---

## Endpoint Details

### `GET /auth/google`

Redirects browser to:
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=CLIENT_ID
  &redirect_uri=CALLBACK_URL
  &response_type=code
  &scope=openid email profile
  &state=<random CSRF token stored in session>
```

### `GET /auth/google/callback?code=...&state=...`

1. Validate `state` matches CSRF token
2. Exchange `code` for tokens via Google's token endpoint
3. Decode `id_token` to get `{ sub, email, name, picture }`
4. Upsert user: find by `googleId` (sub) or `email`, create if new
5. Issue JWT access token + refresh token
6. Redirect to frontend:
   - Access token in URL fragment: `https://app.example.com/#token=<accessToken>`
   - Refresh token in `httpOnly` cookie

### `POST /auth/refresh`

```
Request:  (refreshToken cookie)
Response: { accessToken }
```

Rotates refresh token — old one deleted, new one issued.

### `POST /auth/logout`

```
Request:  (refreshToken cookie)
Response: 204
```

Deletes refresh token from DB, clears cookie.

---

## JWT

**Access token payload:**
```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1234567890,
  "exp": 1234568790
}
```

- Signed with `HS256` using `JWT_SECRET`
- Expiry: 15 minutes
- Sent by client as `Authorization: Bearer <token>` on every protected request

---

## Auth Middleware (`requireAuth`)

Applied to all protected routes:

1. Extract `Authorization: Bearer <token>` header
2. Verify signature and expiry
3. Attach `ctx.user = { id, email, name }` for downstream handlers
4. Return `401` if missing, invalid, or expired

---

## Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

JWT_SECRET=                  # min 32 chars, never committed
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

MONGODB_URI=
FRONTEND_URL=http://localhost:5173
```

---

## Security Considerations

- **CSRF**: `state` parameter validated on callback; generated fresh per login attempt
- **Refresh token storage**: stored as SHA-256 hash in DB — breach doesn't expose valid sessions
- **Refresh token rotation**: each `/auth/refresh` invalidates the old token
- **httpOnly cookie**: refresh token unreachable from JS
- **Google tokens**: never forwarded to frontend or stored — only used server-side to get the user profile

---

## Out of Scope

- Other OAuth providers (GitHub, Apple)
- Email/password fallback
- Admin roles
- Email verification (Google guarantees verified emails)
