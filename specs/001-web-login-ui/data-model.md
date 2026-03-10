# Data Model: Web Login UI

**Feature**: `001-web-login-ui`
**Date**: 2026-03-09

## Client-Side State

This feature introduces no persistent server-side entities. All state is transient and lives in
the browser for the duration of a session.

### AuthSession

Represents the authenticated identity held in `sessionStorage` under the key `"access_token"`.

| Field        | Type   | Description                                              |
|--------------|--------|----------------------------------------------------------|
| access_token | string | Signed JWT issued by the server after Google OAuth       |

**Lifecycle**:
- Created: after successful OAuth callback, token extracted from URL hash `#token=<jwt>`
- Read: on every page load to determine if the user is already authenticated
- Refreshed: via `POST /auth/refresh` when absent or expired (uses httpOnly refresh cookie)
- Destroyed: on logout (explicit clear of `sessionStorage`) or when browser tab/session ends

**Expiry detection**: The JWT payload contains a standard `exp` claim (Unix timestamp). The
frontend MUST decode the payload (base64, no signature verification — that is the server's job)
to check expiry before using the stored token. If expired, treat as absent and call
`POST /auth/refresh`.

### AuthError

Transient state representing a failed or cancelled authentication attempt. Never persisted.

| Field   | Type   | Description                                          |
|---------|--------|------------------------------------------------------|
| message | string | Human-readable reason shown on the login page        |
| code    | string | Short machine code from server query param (optional)|

**Lifecycle**:
- Created: when the OAuth callback URL contains an `error` query parameter
  (e.g., `/?error=access_denied`)
- Displayed: as an inline message on the login page
- Destroyed: when the user clicks "Sign in with Google" again (fresh attempt clears the error)

## URL State Conventions

| Signal                  | Mechanism                      | Example                          |
|-------------------------|--------------------------------|----------------------------------|
| Successful OAuth return | URL hash fragment              | `/#token=eyJ...`                 |
| Failed OAuth return     | URL query parameter from server| `/?error=access_denied`          |

Both signals are consumed and cleared from the URL immediately on page load using
`window.history.replaceState()`.
