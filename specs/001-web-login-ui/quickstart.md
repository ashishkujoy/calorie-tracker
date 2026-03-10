# Quickstart: Web Login UI

**Feature**: `001-web-login-ui`
**Date**: 2026-03-09

## Prerequisites

- Node.js installed, `npm install` already run at repo root
- A `.env` file at repo root with the following variables:

```env
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
FRONTEND_URL=http://localhost:3000
PORT=3000
JWT_SECRET=<a-long-random-secret>
MONGODB_URI=mongodb://localhost:27017/calorie-tracker
```

> The `FRONTEND_URL` and `PORT` are set so the frontend is served from the same origin as the
> API, avoiding cross-origin cookie issues.

## Running the App

```bash
npm start
# or: node src/index.js
```

Open `http://localhost:3000` in your browser. You should see the login page.

## Testing the Login Flow

1. Navigate to `http://localhost:3000` — login page appears.
2. Click "Sign in with Google" — you are redirected to Google.
3. Complete Google sign-in — you are redirected back to `http://localhost:3000/#token=<jwt>`.
4. The page extracts the token, stores it in `sessionStorage`, clears the URL hash, and
   redirects you to the dashboard/meals page.
5. Refresh the page — you should land directly on the dashboard (no login prompt) because the
   token is in `sessionStorage`.
6. Open a new tab at `http://localhost:3000` — the app silently calls `POST /auth/refresh`
   using the httpOnly cookie and you land on the dashboard without logging in again.

## Testing Error Handling

To simulate a cancelled login:

1. Click "Sign in with Google".
2. On the Google consent screen, click "Cancel" or close the window.
3. You should be returned to the login page with the message:
   "Sign-in was cancelled. Please try again."

## Running Automated Tests

```bash
npm test
```

The `public/js/auth.test.js` file (Vitest + jsdom) tests token extraction, `sessionStorage`
management, and error detection logic.

## File Structure (post-implementation)

```
public/
├── index.html          # Login page shell (also handles auth callback)
├── dashboard.html      # Post-login placeholder page
├── css/
│   └── style.css       # Minimalist styles
└── js/
    ├── auth.js         # Token extraction, sessionStorage, refresh logic
    └── auth.test.js    # Vitest unit tests (co-located)

src/
└── server.js           # Updated to add serveStatic for public/
```
