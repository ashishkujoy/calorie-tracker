# API Contracts: Auth Endpoints (consumed by Web Login UI)

**Feature**: `001-web-login-ui`
**Date**: 2026-03-09
**Note**: All endpoints below are already implemented server-side. This document records the
contract from the frontend's perspective — what the login UI sends and what it expects back.

---

## GET /auth/google

Initiates the Google OAuth flow. The browser navigates to this URL directly (full-page redirect).

**Triggered by**: User clicking "Sign in with Google"

**Request**: No body, no headers required. Cookies are sent automatically by the browser.

**Response**: `302 Redirect → Google accounts.google.com`

**Frontend behaviour**:
- Set button to disabled/loading state before navigating
- Navigate via `window.location.href = '/auth/google'` (same-origin, no fetch needed)

---

## GET /auth/google/callback → redirect to frontend

The server handles this internally after Google redirects back. The frontend never calls this
endpoint directly.

**What the frontend receives** (as a redirect landing):

**Success case** — redirects to:
```
${FRONTEND_URL}/#token=<access_token_jwt>
```

**Failure case** — the current server implementation returns JSON `{ error }` with status 400.
The frontend should handle a redirect that includes an `error` query parameter. The server
should be updated (in a follow-up) to redirect with `/?error=<code>` instead of returning raw
JSON so the frontend can display a friendly message. For now, the login page handles errors
surfaced by the OAuth `error` parameter Google passes (e.g., `?error=access_denied`).

**Frontend behaviour on success**:
1. Page loads at `/#token=<jwt>`
2. Extract token from `window.location.hash`
3. Store in `sessionStorage` under key `"access_token"`
4. Clear hash via `window.history.replaceState(null, '', '/')`
5. Redirect to `/dashboard` (or `/meals` placeholder)

**Frontend behaviour on error** (Google passes `?error=access_denied` to callback):
1. Server logs error and returns 400 JSON (current behaviour)
2. Frontend detects `window.location.search` contains `?error=` on page load
3. Displays human-readable message: "Sign-in was cancelled. Please try again."
4. Removes `?error=` from URL via `replaceState`

---

## POST /auth/refresh

Silently obtains a new access token using the httpOnly refresh cookie.

**Triggered by**: Page load when `sessionStorage` has no valid access token

**Request**:
- Method: `POST`
- URL: `/auth/refresh`
- Headers: none (cookie sent automatically)
- Body: none

**Response — success** (`200 OK`):
```json
{ "accessToken": "<jwt>" }
```

**Response — failure** (`401 Unauthorized`):
```json
{ "error": "missing_token" }
// or
{ "error": "invalid_token" }
```

**Frontend behaviour**:
- On success: store `accessToken` in `sessionStorage`, proceed to app
- On failure: clear any stale `sessionStorage` entry, show login page

---

## JWT Payload Structure (access token)

Decoded client-side (base64 only, no signature verification) to check expiry.

```json
{
  "id": "<mongodb_user_id>",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1700000000,
  "exp": 1700003600
}
```

The frontend uses `exp` to determine if the stored token is still valid before making
API calls, avoiding unnecessary 401 responses.
