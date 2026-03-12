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
  mealName: "Grilled Chicken",
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

  it("response includes mealName when analysis succeeds", async () => {
    runMealAnalysis.mockResolvedValue({ success: true, meal: MOCK_MEAL });
    const res = await postImage(makeToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.meal.mealName).toBe("string");
    expect(body.meal.mealName.length).toBeGreaterThan(0);
  });

  it("saves mealName and imageThumbnail in the database", async () => {
    runMealAnalysis.mockResolvedValue({ success: true, meal: MOCK_MEAL });
    await postImage(makeToken());
    const doc = await db.collection("meals").findOne({});
    expect(typeof doc.mealName).toBe("string");
    expect(typeof doc.imageThumbnail).toBe("string");
    expect(doc.imageThumbnail).toMatch(/^data:image\//);
  });
});

describe("GET /meals/history", () => {
  const OTHER_USER_ID = "507f1f77bcf86cd799439012";

  beforeEach(async () => {
    await db.collection("meals").deleteMany({});
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/meals/history");
    expect(res.status).toBe(401);
  });

  it("returns empty meals array for user with no scans", async () => {
    const res = await app.request("/meals/history", {
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meals).toEqual([]);
  });

  it("returns meals sorted by recordedAt descending", async () => {
    const { ObjectId } = await import("mongodb");
    const userId = new ObjectId(USER_ID);
    const older = new Date("2026-03-10T10:00:00Z");
    const newer = new Date("2026-03-12T12:00:00Z");
    await db.collection("meals").insertMany([
      { userId, recordedAt: older, mealName: "Old Meal", imageThumbnail: "data:image/jpeg;base64,old", items: [], totals: { calories_kcal: 100, protein_g: 5, fat_g: 3, carbohydrates_g: 10, fiber_g: 1, sugar_g: 1 } },
      { userId, recordedAt: newer, mealName: "New Meal", imageThumbnail: "data:image/jpeg;base64,new", items: [], totals: { calories_kcal: 200, protein_g: 10, fat_g: 6, carbohydrates_g: 20, fiber_g: 2, sugar_g: 2 } },
    ]);
    const res = await app.request("/meals/history", {
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meals).toHaveLength(2);
    expect(body.meals[0].mealName).toBe("New Meal");
    expect(body.meals[1].mealName).toBe("Old Meal");
  });

  it("returns meals with id, mealName, imageThumbnail, recordedAt, totals fields", async () => {
    const { ObjectId } = await import("mongodb");
    await db.collection("meals").insertOne({
      userId: new ObjectId(USER_ID),
      recordedAt: new Date(),
      mealName: "Test Meal",
      imageThumbnail: "data:image/jpeg;base64,abc",
      items: [],
      totals: { calories_kcal: 300, protein_g: 20, fat_g: 10, carbohydrates_g: 15, fiber_g: 1, sugar_g: 1 },
    });
    const res = await app.request("/meals/history", {
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    const body = await res.json();
    const meal = body.meals[0];
    expect(typeof meal.id).toBe("string");
    expect(meal.mealName).toBe("Test Meal");
    expect(meal.imageThumbnail).toBe("data:image/jpeg;base64,abc");
    expect(typeof meal.recordedAt).toBe("string");
    expect(typeof meal.totals.calories_kcal).toBe("number");
    expect(meal.items).toBeUndefined();
  });

  it("does not return meals belonging to other users", async () => {
    const { ObjectId } = await import("mongodb");
    await db.collection("meals").insertOne({
      userId: new ObjectId(OTHER_USER_ID),
      recordedAt: new Date(),
      mealName: "Other User Meal",
      imageThumbnail: "data:image/jpeg;base64,x",
      items: [],
      totals: { calories_kcal: 100, protein_g: 5, fat_g: 3, carbohydrates_g: 10, fiber_g: 1, sugar_g: 1 },
    });
    const res = await app.request("/meals/history", {
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    const body = await res.json();
    expect(body.meals).toHaveLength(0);
  });
});

describe("DELETE /meals/:id", () => {
  beforeEach(async () => {
    await db.collection("meals").deleteMany({});
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/meals/507f1f77bcf86cd799439099", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-ObjectId string", async () => {
    const res = await app.request("/meals/not-an-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 404 when meal belongs to a different user", async () => {
    const { ObjectId } = await import("mongodb");
    const inserted = await db.collection("meals").insertOne({
      userId: new ObjectId("507f1f77bcf86cd799439012"),
      recordedAt: new Date(),
      mealName: "Other Meal",
      imageThumbnail: "data:image/jpeg;base64,x",
      items: [],
      totals: { calories_kcal: 100, protein_g: 5, fat_g: 3, carbohydrates_g: 10, fiber_g: 1, sugar_g: 1 },
    });
    const res = await app.request(`/meals/${inserted.insertedId.toString()}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns deleted:true and removes the document", async () => {
    const { ObjectId } = await import("mongodb");
    const inserted = await db.collection("meals").insertOne({
      userId: new ObjectId(USER_ID),
      recordedAt: new Date(),
      mealName: "My Meal",
      imageThumbnail: "data:image/jpeg;base64,x",
      items: [],
      totals: { calories_kcal: 100, protein_g: 5, fat_g: 3, carbohydrates_g: 10, fiber_g: 1, sugar_g: 1 },
    });
    const id = inserted.insertedId.toString();
    const res = await app.request(`/meals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${makeToken()}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    const doc = await db.collection("meals").findOne({ _id: inserted.insertedId });
    expect(doc).toBeNull();
  });
});
