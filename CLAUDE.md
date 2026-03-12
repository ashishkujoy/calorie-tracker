# calorie-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-09

## Active Technologies
- Node.js 20 (ESM, `"type": "module"`) + Vanilla JS (ES Modules, no build step) + Hono 4 + `@hono/node-server` (static serving + multipart parsing built-in); Vitest 4 (tests); jsdom (frontend tests) (001-meal-image-scan)
- N/A for this feature — no data persisted (001-meal-image-scan)
- Node.js 20 (ESM — `"type": "module"`) + Hono 4 + `@hono/node-server`; `@langchain/ollama` + `@langchain/core`; Zod 4; `mongodb`; `jsonwebtoken`; Pino (001-meal-calorie-tracking)
- MongoDB 7 (`mongodb` driver); `mongodb-memory-server` for tests (001-meal-calorie-tracking)

- HTML5 / CSS3 / Vanilla JavaScript (ES Modules, no build step) + `@hono/node-server/serve-static` (already installed, zero new deps) (001-web-login-ui)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

HTML5 / CSS3 / Vanilla JavaScript (ES Modules, no build step): Follow standard conventions
- Ensure to use const fnName = () => { ... } for functions.

## Recent Changes
- 002-meal-scan-history: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 001-meal-calorie-tracking: Added Node.js 20 (ESM — `"type": "module"`) + Hono 4 + `@hono/node-server`; `@langchain/ollama` + `@langchain/core`; Zod 4; `mongodb`; `jsonwebtoken`; Pino
- 001-meal-image-scan: Added Node.js 20 (ESM, `"type": "module"`) + Vanilla JS (ES Modules, no build step) + Hono 4 + `@hono/node-server` (static serving + multipart parsing built-in); Vitest 4 (tests); jsdom (frontend tests)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
