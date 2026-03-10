// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../test/createTestDb.js";
import { createApp } from "../server.js";
import { signAccessToken } from "../lib/jwt.js";

let db;
let closeDb;
let app;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  ({ db, close: closeDb } = await createTestDb());
  app = createApp(db);
});

afterAll(async () => {
  await closeDb();
  delete process.env.JWT_SECRET;
});

const makeToken = () =>
  signAccessToken({ id: "test-user-id", email: "test@example.com", name: "Test User" });

describe("POST /meals/scan-and-record", () => {
  it("returns 401 without auth token", async () => {
    const form = new FormData();
    form.append("image", new File(["data"], "meal.jpg", { type: "image/jpeg" }));
    const res = await app.request("/meals/scan-and-record", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(401);
  });

  it("[T005] returns 200 with dummy meal JSON for a valid image upload", async () => {
    const form = new FormData();
    form.append("image", new File(["data"], "meal.jpg", { type: "image/jpeg" }));
    const res = await app.request("/meals/scan-and-record", {
      method: "POST",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("meal");
    expect(typeof body.meal.name).toBe("string");
    expect(Array.isArray(body.meal.items)).toBe(true);
    expect(body.meal.items.length).toBeGreaterThan(0);
    expect(body.meal).toHaveProperty("totals");
    expect(typeof body.meal.totals.calories_kcal).toBe("number");
  });

  it("[T017] returns 400 when the image field is missing", async () => {
    const form = new FormData();
    const res = await app.request("/meals/scan-and-record", {
      method: "POST",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: form,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });

  it("[T018] returns 413 when the image exceeds 10 MB", async () => {
    const bigFile = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" }
    );
    const form = new FormData();
    form.append("image", bigFile);
    const res = await app.request("/meals/scan-and-record", {
      method: "POST",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: form,
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toHaveProperty("error");
  });
});
