# Research: Meal Calorie Tracking

**Branch**: `001-meal-calorie-tracking` | **Date**: 2026-03-10

## Decision Log

---

### Decision 1: AI Pipeline Integration Strategy

**Decision**: Extract the sequential pipeline from `src/agent.js` into an importable module `src/meal_agent.js` that exports `runMealAnalysis(imageBuffer)`. The CLI script `src/agent.js` becomes a thin wrapper around this module.

**Rationale**: `src/agent.js` currently contains a `main()` function that is not importable by the route handler. The route needs a reusable function. Extracting to `src/meal_agent.js` satisfies Constitution Principle IV ("flow through the LangGraph agent defined in `src/agent.js`" — the constitution intends the agent logic, not the CLI entry point) while keeping `agent.js` intact as a dev tool. Creating a full LangGraph StateGraph for a two-step sequential pipeline would violate Principle V (YAGNI); the sequential chain (recognise → count) is the correct minimal implementation.

**Alternatives considered**:
- **Full LangGraph StateGraph**: Satisfies Principle IV literally but over-engineered for a deterministic two-step sequence. Rejected per Principle V.
- **Inline pipeline directly in route handler**: Violates Principle IV and creates duplication with `agent.js`. Rejected.

---

### Decision 2: Image Buffer Conversion

**Decision**: Convert the Hono `File` object (received from multipart upload) to a Node.js `Buffer` using `Buffer.from(await image.arrayBuffer())` before passing to `createFoodRecogniser`.

**Rationale**: `food_recogniser.js` calls `.toString("base64")` on the input, which is a `Buffer` method. The LangChain Ollama multimodal call requires a base64-encoded string. The `File` → `Buffer` conversion is a one-liner at the route boundary.

**Alternatives considered**:
- Modify `food_recogniser.js` to accept a `File` directly: breaks the existing CLI agent test tool. Rejected.

---

### Decision 3: Zod Validation Before Persistence

**Decision**: Define a `mealRecordSchema` in `src/models/meal.js` using Zod. Before inserting into MongoDB, validate the assembled meal document against this schema. If validation fails, return a 422 error without persisting.

**Rationale**: Constitution Principle IV mandates validation of agent output before storage. While LangChain's `.withStructuredOutput()` validates within the LLM call, an additional explicit validation at the persistence boundary prevents malformed data if the schema evolves independently.

**Alternatives considered**:
- Trust `.withStructuredOutput()` alone: Acceptable for the LLM layer but provides no protection against future code changes that bypass the LLM. Rejected as it does not satisfy Principle IV's "MUST be validated … before being stored" requirement.

---

### Decision 4: Meals MongoDB Collection Schema

**Decision**: New `meals` collection with fields: `userId` (ObjectId), `recordedAt` (Date), `items` (array of item objects), `totals` (nutrition object). Index on `{ userId: 1 }`.

**Rationale**: Mirrors the shape returned by `calories_counter.js` (`items[]` + `totals`) with the addition of `userId` and `recordedAt` for ownership and time-ordering. The `userId` index enables efficient future queries (history feature). No schema migrations are needed — MongoDB is schemaless; the Zod schema enforces shape at the application layer.

**Alternatives considered**:
- Separate `meal_items` collection with foreign keys: relational normalisation not warranted for this personal tool scale. Rejected per Principle V.

---

### Decision 5: Error Handling Strategy

**Decision**:
- Food recogniser fails (LLM error or empty items array) → return HTTP 422 `{ error: "Could not identify any food items in the image. Please try again with a clearer photo." }`. No record saved.
- Calories counter fails (LLM error) → return HTTP 422 `{ error: "Nutrition analysis failed. Please try again." }`. No record saved.
- Image validation failure (missing/wrong type/too large) → existing 400/413 responses unchanged.

**Rationale**: HTTP 422 (Unprocessable Entity) correctly signals that the request was well-formed but the server could not process it. This is preferable to 500 (which implies an unexpected server error) when the AI model simply cannot identify food.

**Alternatives considered**:
- Return 500 for all AI failures: Misleading; implies a server bug rather than a content issue. Rejected.
- Return 200 with a null/empty meal: Violates FR-008 (no silent failures). Rejected.
