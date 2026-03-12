# Research: Meal Scan History

**Feature**: 002-meal-scan-history
**Phase**: 0 — Resolved decisions before design

---

## Decision 1: Short Meal Name Generation

**Decision**: Derive the short meal name programmatically from the LLM-recognized items list inside `meal_agent.js` — no additional LLM call.

**Rationale**: The food recogniser already returns a list of item names (e.g., `["Grilled Chicken", "Mixed Vegetables", "Rice"]`). A 2–4 word name can be constructed by taking the first 1–2 item names:
- 1 item → use that item's name directly (e.g., "Grilled Chicken")
- 2+ items → `{item[0].name} with {item[1].name}` or, if item[0].name is already 2+ words, just item[0].name (e.g., "Steak with Vegetables")

This adds zero latency, zero extra tokens, and zero new dependencies.

**Alternatives Considered**:
- Separate LLM prompt to generate a creative name → rejected; extra round-trip latency per scan, adds failure surface, violates YAGNI.
- Item category-based naming → rejected; adds mapping tables and complexity for no user benefit over simple item name.

---

## Decision 2: Image Thumbnail Storage

**Decision**: Store the scanned meal image as a base64 data URL directly in the `meals` MongoDB document under an `imageThumbnail` field.

**Rationale**: This is a personal-use tool. The number of stored scans is small. Storing base64 in MongoDB:
- Requires zero new infrastructure (no GridFS, no filesystem, no CDN).
- The frontend can use the value directly as an `<img src="...">` attribute.
- Average JPEG of a meal photo ≈ 200–500 KB base64 encoded; MongoDB document limit is 16 MB — well within range.

**Alternatives Considered**:
- GridFS → rejected; adds driver API complexity for a single-user tool (YAGNI).
- Serve via separate `GET /meals/:id/image` endpoint + store buffer in DB → rejected; extra endpoint, extra request per thumbnail render, no benefit at this scale.
- No thumbnail (display placeholder icon) → rejected; spec explicitly requires the meal image in the history entry.
- Resize to thumbnail before storing → valid enhancement for later; not needed now.

---

## Decision 3: Date Grouping — Client vs. Server

**Decision**: Group meals by date on the **client side** using the `recordedAt` timestamp. The backend returns a flat array sorted by `recordedAt` descending.

**Rationale**:
- Date grouping is presentation logic. The backend's job is to return data; the frontend's job is to present it.
- Client local timezone is needed for correct "Today"/"Yesterday" labels — the server does not know the user's timezone without extra plumbing.
- Existing frontend pattern (`meal-scan.js`) already builds UI from raw API data.
- MongoDB aggregation pipeline for grouping → unnecessary complexity for single-user tool.

**Alternatives Considered**:
- Server-side `$group` aggregation by date → rejected; adds pipeline complexity, requires timezone offset parameter, harder to test.
- Server sends pre-grouped JSON → rejected; tightly couples presentation format to API, harder to reuse data for other purposes.

---

## Decision 4: History Endpoint Pagination

**Decision**: No pagination for the initial implementation. `GET /meals/history` returns all meals for the authenticated user, sorted by `recordedAt` descending.

**Rationale**: Personal tool with one user. Realistically tens to low hundreds of scans. YAGNI applies — adding `limit`/`offset` now is speculative complexity.

**Alternatives Considered**:
- Cursor-based pagination → rejected; premature for current scale.
- `limit` query param (default 50) → a reasonable future enhancement, not required now.

---

## Decision 5: Delete Safety

**Decision**: No confirmation dialog. Single click/tap on the trash icon triggers immediate deletion. No undo.

**Rationale**: Spec explicitly states "single interaction" (SC-006). The assumption in the spec is that deletion is permanent with no undo mechanism. This matches the existing app's low-ceremony UX.

**Alternatives Considered**:
- Optimistic UI with undo toast → valid UX pattern, but adds state management complexity not required by spec.
- Modal confirmation dialog → rejected; SC-006 requires single interaction.
