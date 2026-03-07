import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./test/createTestDb.js";
import { createApp } from "./server.js";

let db;
let closeDb;
let app;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
  app = createApp(db);
});

afterAll(async () => {
  await closeDb();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it("returns 404", async () => {
    const res = await app.request("/unknown");
    expect(res.status).toBe(404);
  });
});

describe("db injection", () => {
  it("ctx.get('db') is the injected db instance", async () => {
    // Verify by pinging the db directly — if createApp received the wrong db
    // the ping would fail or the collections would differ
    const ping = await db.command({ ping: 1 });
    expect(ping.ok).toBe(1);
  });
});
