# Research: Meal Image Scan

**Feature**: 001-meal-image-scan
**Date**: 2026-03-10

---

## Decision 1: File Upload Handling on the Server

**Decision**: Use Hono's built-in `c.req.parseBody()` to handle `multipart/form-data` uploads. No additional libraries needed.

**Rationale**: Hono natively supports multipart form data. `c.req.parseBody()` returns an object where file fields are `File` objects (Web API `File` extends `Blob`). This requires zero new dependencies and aligns with Principle V (Simplicity / YAGNI).

**Alternatives considered**:
- `busboy` / `multer`: Extra dependencies not needed since Hono handles this natively.
- Base64 encoding over JSON: Increases payload size 33%; multipart is the standard for file uploads.

---

## Decision 2: Dummy Server Response Shape

**Decision**: The upload endpoint returns a static JSON placeholder that mimics the shape the real AI response will eventually produce, so the frontend can render the full display path today.

**Rationale**: The spec's primary goal is early UI feedback (SC-004). Returning a response that mirrors the future real shape means the display components require no changes when the AI is wired in later. The shape is derived from the output format already defined in `src/calories_counter.js`.

**Response shape**:
```json
{
  "meal": {
    "name": "Sample Meal",
    "items": [
      { "name": "Grilled Chicken", "quantity": "150g", "calories_kcal": 248, "protein_g": 46.5, "fat_g": 5.4, "carbohydrates_g": 0.0 }
    ],
    "totals": {
      "calories_kcal": 248,
      "protein_g": 46.5,
      "fat_g": 5.4,
      "carbohydrates_g": 0.0,
      "fiber_g": 0.0,
      "sugar_g": 0.0
    }
  }
}
```

**Alternatives considered**:
- Returning `{success: true}` only: Doesn't exercise the display components; defeats the purpose of early UI feedback.
- Real AI call: Out of scope for this feature; adds Ollama runtime dependency to the test cycle.

---

## Decision 3: Image Picker UI Approach

**Decision**: Use a standard `<input type="file" accept="image/*">` element, visually hidden and triggered by a styled "Scan Meal" button. Show an `<img>` preview via `URL.createObjectURL()` before submission.

**Rationale**: Works on all browsers and mobile devices (invokes native camera/file chooser). Zero dependencies. Consistent with the project's no-build-step constraint.

**Alternatives considered**:
- `capture="environment"`: Opens camera directly on mobile but bypasses file library; better UX to let the user choose (spec says "select or capture").
- Canvas-based image resizing before upload: Over-engineering for this iteration; the feature goal is cycle validation, not optimal upload size.

---

## Decision 4: Client-Side Upload Mechanism

**Decision**: Use the browser `fetch` API with a `FormData` object to `POST` the image as `multipart/form-data` to `/meals/scan-and-record`, passing the stored JWT in the `Authorization: Bearer` header.

**Rationale**: Follows the existing auth pattern established in `public/js/auth.js` (`getStoredToken()`). No new auth infrastructure needed.

**Alternatives considered**:
- XMLHttpRequest: Provides upload progress events but adds complexity not needed for this iteration.
- WebSocket streaming: Appropriate for real-time processing; not needed for a single-shot upload flow.

---

## Decision 5: Server Endpoint — Use Existing Stub vs. New Route

**Decision**: Extend the existing `POST /meals/scan-and-record` stub in `src/routes/meals.js` to accept a file field and return the richer dummy response. No new route file needed.

**Rationale**: The route already exists, is already protected by `requireAuth`, and is registered in `src/server.js`. Adding a new route for the same action would violate Principle V.

**Alternatives considered**:
- New `POST /meals/scan` route: Redundant; the existing stub is purpose-built for this action.

---

## Decision 6: File Size Validation

**Decision**: Reject uploads larger than 10 MB on the server with a `413` response. Match the assumption documented in the spec.

**Rationale**: Prevents abuse and aligns with the spec assumption. Hono does not enforce this automatically; a simple size check on the `File` object suffices.

---

## Decision 7: Frontend Module Structure

**Decision**: Add a new `public/js/meal-scan.js` ES module rather than extending `dashboard.js`. `dashboard.js` loads `meal-scan.js` via an ES module import.

**Rationale**: Single Responsibility Principle at the file level keeps `dashboard.js` focused on auth/display and `meal-scan.js` focused on the scan flow. Follows the established pattern of one JS file per concern (`auth.js`, `index.js`, `dashboard.js`).

---

## Resolved Clarifications

All NEEDS CLARIFICATION items from the spec were resolved by reasonable defaults (no markers existed). No outstanding unknowns.
