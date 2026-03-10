# Feature Specification: Web Login UI

**Feature Branch**: `001-web-login-ui`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "login using webapp. We already have a server side implementation of login and
logout. This feature will be the first in user interface side. Providing a clean and minimalistic page for
user to login to app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign In with Google (Priority: P1)

A new or returning user visits the app in their browser and is presented with a clean, minimal login page.
They click "Sign in with Google", are redirected through the Google OAuth flow, and land on the app's main
page fully authenticated. The session is maintained across page refreshes.

**Why this priority**: This is the only authentication path — without it no user can access any part of the
app. It is the singular gateway to all other features.

**Independent Test**: Open the login page in a browser, click the Google sign-in button, complete the OAuth
flow, and confirm you are redirected to a protected page with a valid session.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user visits the app root, **When** the page loads, **Then** the login page
   is displayed with a visible "Sign in with Google" button and no other distracting elements.
2. **Given** the login page is displayed, **When** the user clicks "Sign in with Google", **Then** they are
   redirected to Google's authentication page.
3. **Given** the user completes Google sign-in successfully, **When** Google redirects back to the app,
   **Then** the user is landed on the main/dashboard page and their name or avatar is visible to confirm
   identity.
4. **Given** the user is already authenticated, **When** they navigate to the login page, **Then** they are
   automatically redirected to the main page (no double-login).

---

### User Story 2 - Graceful Authentication Error Handling (Priority: P2)

If the OAuth flow fails (user cancels, Google returns an error, or the server rejects the token), the user
is returned to the login page with a clear, non-technical message explaining that sign-in did not succeed
and they can try again.

**Why this priority**: Error handling is essential for trust and usability; a blank screen or cryptic error
on auth failure creates a poor first impression.

**Independent Test**: Simulate an OAuth error (e.g., cancel the Google consent screen or trigger a server
error response) and confirm the login page reappears with a user-friendly message.

**Acceptance Scenarios**:

1. **Given** the user cancels the Google sign-in flow, **When** they are returned to the app, **Then** the
   login page is shown again with a friendly message (e.g., "Sign-in was cancelled. Please try again.").
2. **Given** an unexpected server error occurs during token exchange, **When** the user is redirected back,
   **Then** a clear, non-technical error message is displayed and the "Sign in with Google" button remains
   available.

---

### Edge Cases

- What happens when the user's browser blocks popups? The OAuth flow MUST use a full-page redirect, not a
  popup, to avoid popup-blocker issues.
- What happens if the session token expires while the user is on the main page? The auth middleware
  redirects them back to the login page; the login UI must gracefully accept this redirect without errors.
- What happens on a slow network where the Google redirect is delayed? A loading indicator SHOULD be shown
  after the button is clicked until the redirect begins.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display the login page as the default landing view for all unauthenticated users.
- **FR-002**: The login page MUST provide exactly one call-to-action: a "Sign in with Google" button.
- **FR-003**: Clicking the sign-in button MUST initiate the Google OAuth flow via a full-page redirect
  (not a popup).
- **FR-004**: Upon successful authentication, the app MUST redirect the user to the main/dashboard view.
- **FR-005**: The login page MUST display a human-readable error message when authentication fails or is
  cancelled, without exposing any technical error details or stack traces.
- **FR-006**: An already-authenticated user who navigates to the login URL MUST be automatically redirected
  to the main view without requiring any action.
- **FR-007**: The login page MUST be fully functional and visually correct on screen widths from 375 px
  (mobile) to 1440 px (desktop).
- **FR-008**: The login page design MUST be minimalistic — containing only the app name/logo, the sign-in
  button, and (when applicable) an error message; no navigation, ads, or unrelated content.

### Key Entities

- **Session**: Represents an authenticated user's active context; established after a successful Google
  OAuth exchange; survives page refreshes until explicit logout or expiry.
- **Authentication Error**: A transient, human-readable message surfaced when sign-in fails or is
  cancelled; displayed on the login page and cleared once the user retries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can successfully sign in from scratch in under 60 seconds (including the Google
  consent screen).
- **SC-002**: The login page loads and becomes interactive in under 2 seconds on a standard broadband
  connection.
- **SC-003**: 100% of authentication failure and cancellation cases display a user-readable message — zero
  blank screens or raw error codes are ever shown to the user.
- **SC-004**: The login page renders without horizontal scrolling and is fully usable on screen widths
  from 375 px to 1440 px.
- **SC-005**: An already-authenticated user visiting the login URL is redirected to the main page within
  1 second, without any additional click required.

## Assumptions

- The server-side `/auth/google` initiation endpoint and OAuth callback handler are already implemented
  and functional; this feature covers the browser-side UI only.
- Google OAuth is the sole authentication method — no email/password or other social login is required.
- The post-login destination is the existing `/meals` route (placeholder); its full design is out of scope
  for this feature.
- The frontend will be delivered as a static HTML page (with CSS and minimal JavaScript) hosted or served
  alongside the existing Node.js server, consistent with this being a personal tool.
- Logout UI is out of scope for this feature; the server-side logout endpoint already exists.
