// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { createTestDb } from "../test/createTestDb.js";
import { createApp } from "../server.js";
import { signAccessToken } from "../lib/jwt.js";
import { runMealAnalysis } from "../meal_agent.js";

vi.mock("../meal_agent.js", () => ({
  runMealAnalysis: vi.fn(),
}));

const USER_ID = "507f1f77bcf86cd799439011";

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

beforeEach(() => {
  vi.clearAllMocks();
});

const makeToken = () =>
  signAccessToken({ id: USER_ID, email: "test@example.com", name: "Test User" });

const MOCK_MEAL = {
  items: [
    {
      name: "Grilled Chicken",
      quantity: "150g",
      nutrition: {
        calories_kcal: 248,
        protein_g: 46.5,
        fat_g: 5.4,
        carbohydrates_g: 0.0,
        fiber_g: 0.0,
        sugar_g: 0.0,
      },
    },
  ],
  totals: {
    calories_kcal: 248,
    protein_g: 46.5,
    fat_g: 5.4,
    carbohydrates_g: 0.0,
    fiber_g: 0.0,
    sugar_g: 0.0,
  },
};

const postImage = (token) => {
  const form = new FormData();
  form.append("image", new File(["data"], "meal.jpg", { type: "image/jpeg" }));
  return app.request("/meals/scan-and-record", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
};

describe("POST /meals/scan-and-record — authentication and validation", () => {
  it("returns 401 without auth token", async () => {
    const res = await postImage(null);
    expect(res.status).toBe(401);
  });

  it("returns 400 when the image field is missing", async () => {
    const form = new FormData();
    const res = await app.request("/meals/scan-and-record", {
      method: "POST",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: form,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });

  it("returns 413 when the image exceeds 10 MB", async () => {
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

describe("POST /meals/scan-and-record — nutrition analysis", () => {
  it("returns 200 with meal items and totals when analysis succeeds", async () => {
    runMealAnalysis.mockResolvedValue({ success: true, meal: MOCK_MEAL });
    const res = await postImage(makeToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.meal.items)).toBe(true);
    expect(body.meal.items.length).toBeGreaterThan(0);
    expect(typeof body.meal.totals.calories_kcal).toBe("number");
  });

  it("returns 422 with an error message when food items cannot be recognised", async () => {
    runMealAnalysis.mockResolvedValue({ success: false, stage: "recognition" });
    const res = await postImage(makeToken());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns 422 with an error message when nutrition calculation fails", async () => {
    runMealAnalysis.mockResolvedValue({ success: false, stage: "calories" });
    const res = await postImage(makeToken());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});

describe("POST /meals/scan-and-record — meal persistence", () => {
  beforeEach(async () => {
    await db.collection("meals").deleteMany({});
  });

  it("saves a meal record to the database when analysis succeeds", async () => {
    runMealAnalysis.mockResolvedValue({ success: true, meal: MOCK_MEAL });
    const res = await postImage(makeToken());
    expect(res.status).toBe(200);
    const count = await db.collection("meals").countDocuments();
    expect(count).toBe(1);
    const doc = await db.collection("meals").findOne({});
    expect(doc.items).toEqual(MOCK_MEAL.items);
    expect(doc.totals).toEqual(MOCK_MEAL.totals);
    expect(doc.recordedAt).toBeInstanceOf(Date);
  });

  it("does not save a meal record when analysis fails", async () => {
    runMealAnalysis.mockResolvedValue({ success: false, stage: "recognition" });
    await postImage(makeToken());
    const count = await db.collection("meals").countDocuments();
    expect(count).toBe(0);
  });
});
