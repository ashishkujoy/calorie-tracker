# calorie-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-09

## Active Technologies
- Node.js 20 (ESM, `"type": "module"`) + Vanilla JS (ES Modules, no build step) + Hono 4 + `@hono/node-server` (static serving + multipart parsing built-in); Vitest 4 (tests); jsdom (frontend tests) (001-meal-image-scan)
- N/A for this feature — no data persisted (001-meal-image-scan)

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
- 001-meal-image-scan: Added Node.js 20 (ESM, `"type": "module"`) + Vanilla JS (ES Modules, no build step) + Hono 4 + `@hono/node-server` (static serving + multipart parsing built-in); Vitest 4 (tests); jsdom (frontend tests)

- 001-web-login-ui: Added HTML5 / CSS3 / Vanilla JavaScript (ES Modules, no build step) + `@hono/node-server/serve-static` (already installed, zero new deps)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
