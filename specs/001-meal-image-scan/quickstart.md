# Quickstart: Meal Image Scan

**Feature**: 001-meal-image-scan
**Date**: 2026-03-10

---

## Prerequisites

- Node.js 20+
- MongoDB running locally (or `MONGODB_URI` pointing to a remote instance)
- `.env` file with all required variables (see `README` or `.env.example`)
- Google OAuth credentials configured (for login)

---

## Running the Feature

1. **Install dependencies** (already satisfied if the project runs):
   ```sh
   npm install
   ```

2. **Start the server**:
   ```sh
   node src/index.js
   ```

3. **Log in**: Open `http://localhost:3000` in your browser and sign in with Google.

4. **Go to the dashboard**: You will be redirected to `http://localhost:3000/dashboard.html` after login.

5. **Scan a meal**:
   - Click the **"Scan Meal"** button on the dashboard.
   - Select or capture a meal photo.
   - Review the preview and click **"Submit"**.
   - The dashboard displays the placeholder meal analysis returned by the server.

---

## Testing the Upload Endpoint Directly

```sh
# Obtain a token first (via browser login → sessionStorage → copy token)
TOKEN="<paste_access_token_here>"

curl -X POST http://localhost:3000/meals/scan-and-record \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/meal.jpg"
```

Expected response:
```json
{
  "meal": {
    "name": "Sample Meal",
    "items": [{ "name": "Grilled Chicken", "quantity": "150g", "calories_kcal": 248, ... }],
    "totals": { "calories_kcal": 248, ... }
  }
}
```

---

## Running Tests

```sh
npm test
```

- Backend route tests are co-located at `src/routes/meals.test.js`
- Frontend scan flow tests are at `tests/public/meal-scan.test.js`

---

## Key Files

| File | Purpose |
|------|---------|
| `public/dashboard.html` | Dashboard page — hosts the Scan Meal entry point |
| `public/js/meal-scan.js` | Client-side scan flow (image picker, preview, upload, result display) |
| `public/js/dashboard.js` | Dashboard initialiser — imports and mounts meal-scan module |
| `src/routes/meals.js` | Server route — receives upload, returns dummy response |
| `src/routes/meals.test.js` | Server-side tests for the upload endpoint |
| `tests/public/meal-scan.test.js` | Frontend unit tests for meal-scan.js |
