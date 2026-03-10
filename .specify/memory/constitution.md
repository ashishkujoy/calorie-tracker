<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: n/a (initial ratification from template)
Added sections:
  - Core Principles (I–V)
  - Technology Stack
  - Development Workflow
  - Governance
Removed sections: n/a
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes required; Constitution Check gates already generic
  - .specify/templates/spec-template.md ✅ no changes required
  - .specify/templates/tasks-template.md ✅ no changes required; test-optional note aligns with Principle III
Follow-up TODOs: none — all placeholders resolved.
-->

# Calorie Tracker Constitution

## Core Principles

### I. Security by Default

Every HTTP route MUST be protected by the `requireAuth` middleware unless explicitly designated
public (e.g., `/health`, `/auth/*`). Authentication uses Google OAuth as the identity provider
with a short-lived JWT access token and a long-lived refresh token stored in MongoDB. Token
signing and verification MUST go through `src/lib/jwt.js`; inline crypto operations are
prohibited. Secrets (signing keys, client IDs) MUST be injected via environment variables and
MUST NOT be hard-coded.

**Rationale**: The app stores personal health data. A single unguarded endpoint leaks user
meal history and biometric trends.

### II. API-First

All functionality MUST be exposed through REST endpoints with consistent JSON responses.
Endpoints MUST follow the established routing pattern: register routers in `src/server.js`,
implement handlers in `src/routes/`, and share infrastructure (db, auth) via Hono context
(`ctx.set` / `ctx.get`). Response shapes MUST be stable across patch releases; breaking
changes require a new route version.

**Rationale**: The server is the single integration boundary. Consistent contracts prevent
clients from encoding implementation assumptions.

### III. Test-First

Tests MUST be co-located with source (e.g., `src/routes/auth.test.js`) and written with
Vitest. For any non-trivial behaviour, tests MUST be written and confirmed to fail before
the implementation is added (Red-Green-Refactor). The test suite MUST pass (`npm test`)
before any branch is merged. An in-memory MongoDB instance (`mongodb-memory-server`) MUST
be used in all tests — no connection to a real database is permitted in the test suite.

**Rationale**: Co-located tests reduce friction; in-memory DB keeps tests hermetic and fast.

### IV. AI-Augmented Nutrition (Validate All Agent Output)

Food recognition and calorie estimation MUST flow through the LangGraph agent defined in
`src/agent.js` (backed by `src/food_recogniser.js` and `src/calories_counter.js`). Agent
output MUST be validated with a Zod schema before being stored or returned to the client.
Raw LLM strings MUST NOT be persisted without parsing. The AI layer is a best-effort
enrichment step; if the agent fails or returns invalid data the system MUST surface a
structured error rather than silently store bad data.

**Rationale**: LLM output is non-deterministic. Validation at the boundary prevents corrupt
nutrition data from propagating into user statistics.

### V. Simplicity (YAGNI)

New code MUST solve the current, concrete requirement. Abstractions are only introduced when
the same pattern appears three or more times. Repositories, factories, service-locators, and
other enterprise patterns are prohibited unless a specific need is demonstrated. Complexity
additions MUST be recorded in the plan's Complexity Tracking table with a justification.

**Rationale**: This is a personal tool. Over-engineering increases maintenance burden without
adding user value.

## Technology Stack

- **Runtime**: Node.js (ESM modules — `"type": "module"`)
- **Web framework**: Hono + `@hono/node-server`
- **Database**: MongoDB 7 via the `mongodb` driver; `mongodb-memory-server` for tests
- **Auth**: Google OAuth (`google-auth-library`) + JWT (`jsonwebtoken`)
- **AI**: LangChain / LangGraph with Ollama as the local model provider
- **Validation**: Zod 4
- **Logging**: Pino (structured JSON); `LOG_LEVEL=silent` in test runs
- **Testing**: Vitest 4

All dependencies MUST be declared in `package.json`. Pinning to exact versions is not
required, but MAJOR version bumps MUST be reviewed and documented.

## Development Workflow

- Feature work MUST happen on a dedicated branch; branch names follow `###-feature-name`
  convention.
- Every branch MUST include relevant tests before opening a PR.
- The `npm test` gate MUST be green before merge.
- Environment variables MUST be documented (add to a `.env.example` at the repo root if one
  exists; create it if not).
- Database schema changes (new collections, index additions) MUST be noted in the PR
  description.

## Governance

This constitution supersedes all informal conventions and prior verbal agreements. Any
amendment MUST:

1. Increment the version following semantic versioning (MAJOR for principle removal or
   redefinition; MINOR for new principle or section; PATCH for clarifications).
2. Update `Last Amended` to the date of the change.
3. Propagate impacts to the templates checklist (see Sync Impact Report header comment).
4. Be committed with message: `docs: amend constitution to vX.Y.Z (<summary>)`.

All implementation plans MUST include a "Constitution Check" section that explicitly gates on
principles I–V before work begins. Any deliberate deviation MUST be recorded in the plan's
Complexity Tracking table and approved before implementation.

**Version**: 1.0.0 | **Ratified**: 2026-03-09 | **Last Amended**: 2026-03-09
