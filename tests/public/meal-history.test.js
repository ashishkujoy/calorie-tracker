import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("/js/auth.js", () => ({
  getStoredToken: vi.fn().mockReturnValue("test-token"),
}));

const { renderMealCard, renderGroupHeader, sumTotals, formatDateLabel, groupByDate, initMealHistory } =
  await import("/js/meal_history.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMeal = (overrides = {}) => ({
  id: "507f1f77bcf86cd799439011",
  mealName: "Steak with Vegetables",
  imageThumbnail: "data:image/jpeg;base64,abc123",
  recordedAt: "2026-03-12T12:51:00.000Z",
  totals: { calories_kcal: 620, protein_g: 48, fat_g: 38, carbohydrates_g: 22 },
  ...overrides,
});

// ── renderMealCard ────────────────────────────────────────────────────────────

describe("[T021] renderMealCard — renders meal name, time, and nutrition badges", () => {
  it("renders mealName text", () => {
    const card = renderMealCard(makeMeal(), () => {});
    expect(card.querySelector(".cs-history-meal-name").textContent).toBe("Steak with Vegetables");
  });

  it("renders a time string", () => {
    const card = renderMealCard(makeMeal(), () => {});
    const time = card.querySelector(".cs-history-meal-time").textContent;
    expect(time.length).toBeGreaterThan(0);
  });

  it("renders a calorie badge", () => {
    const card = renderMealCard(makeMeal(), () => {});
    const badges = [...card.querySelectorAll(".cs-history-badge")];
    expect(badges.some((b) => b.textContent.includes("cal"))).toBe(true);
  });

  it("renders protein, carbs, fat macro badges", () => {
    const card = renderMealCard(makeMeal(), () => {});
    const text = [...card.querySelectorAll(".cs-history-badge")].map((b) => b.textContent).join(" ");
    expect(text).toMatch(/P:/);
    expect(text).toMatch(/C:/);
    expect(text).toMatch(/F:/);
  });

  it("falls back to 'Unnamed Meal' when mealName is absent", () => {
    const card = renderMealCard(makeMeal({ mealName: undefined }), () => {});
    expect(card.querySelector(".cs-history-meal-name").textContent).toBe("Unnamed Meal");
  });

  it("stores meal id in data attribute", () => {
    const card = renderMealCard(makeMeal(), () => {});
    expect(card.dataset.mealId).toBe("507f1f77bcf86cd799439011");
  });
});

describe("[T022] renderMealCard — thumbnail", () => {
  it("renders an <img> when imageThumbnail is present", () => {
    const card = renderMealCard(makeMeal(), () => {});
    const img = card.querySelector(".cs-history-thumb-img");
    expect(img).toBeTruthy();
    expect(img.src).toContain("data:image/jpeg");
  });

  it("renders SVG placeholder when imageThumbnail is absent", () => {
    const card = renderMealCard(makeMeal({ imageThumbnail: undefined }), () => {});
    expect(card.querySelector(".cs-history-thumb-img")).toBeNull();
    expect(card.querySelector("svg")).toBeTruthy();
  });
});

// ── renderGroupHeader ─────────────────────────────────────────────────────────

describe("renderGroupHeader", () => {
  it("shows the date label", () => {
    const h = renderGroupHeader("Today", 2, { calories_kcal: 500, protein_g: 30, fat_g: 20, carbohydrates_g: 40 });
    expect(h.querySelector(".cs-history-date").textContent).toBe("Today");
  });

  it("shows the meal count", () => {
    const h = renderGroupHeader("Today", 2, { calories_kcal: 500, protein_g: 30, fat_g: 20, carbohydrates_g: 40 });
    expect(h.querySelector(".cs-history-count").textContent).toContain("2");
  });

  it("shows aggregate calories in totals", () => {
    const h = renderGroupHeader("Today", 1, { calories_kcal: 620, protein_g: 48, fat_g: 38, carbohydrates_g: 22 });
    expect(h.querySelector(".cs-history-group-totals").textContent).toContain("620");
  });
});

// ── sumTotals ─────────────────────────────────────────────────────────────────

describe("sumTotals", () => {
  it("sums calories and macros across meals", () => {
    const meals = [
      { totals: { calories_kcal: 200, protein_g: 10, fat_g: 5, carbohydrates_g: 20 } },
      { totals: { calories_kcal: 300, protein_g: 20, fat_g: 15, carbohydrates_g: 30 } },
    ];
    const result = sumTotals(meals);
    expect(result.calories_kcal).toBe(500);
    expect(result.protein_g).toBe(30);
    expect(result.fat_g).toBe(20);
    expect(result.carbohydrates_g).toBe(50);
  });

  it("returns zeros for empty array", () => {
    const result = sumTotals([]);
    expect(result.calories_kcal).toBe(0);
  });
});

// ── formatDateLabel ───────────────────────────────────────────────────────────

describe("formatDateLabel", () => {
  it("returns 'Today' for today's date key", () => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(formatDateLabel(key)).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday's date key", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(formatDateLabel(key)).toBe("Yesterday");
  });

  it("returns a formatted date string for older dates", () => {
    const label = formatDateLabel("2026-01-15");
    expect(label).toMatch(/January|Jan/);
    expect(label).toContain("15");
  });
});

// ── groupByDate ───────────────────────────────────────────────────────────────

describe("groupByDate", () => {
  it("groups meals by local date key", () => {
    const meals = [
      makeMeal({ recordedAt: "2026-03-12T10:00:00.000Z" }),
      makeMeal({ id: "2", recordedAt: "2026-03-12T12:00:00.000Z" }),
      makeMeal({ id: "3", recordedAt: "2026-03-11T09:00:00.000Z" }),
    ];
    const groups = groupByDate(meals);
    expect(groups.size).toBe(2);
  });

  it("preserves meal order within a group", () => {
    const meals = [
      makeMeal({ id: "1", recordedAt: "2026-03-12T12:00:00.000Z" }),
      makeMeal({ id: "2", recordedAt: "2026-03-12T10:00:00.000Z" }),
    ];
    const groups = groupByDate(meals);
    const dayMeals = [...groups.values()][0];
    expect(dayMeals[0].id).toBe("1");
    expect(dayMeals[1].id).toBe("2");
  });
});

// ── initMealHistory ───────────────────────────────────────────────────────────

describe("initMealHistory", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders empty state when meals array is empty", async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ meals: [] }) });
    await initMealHistory(container, () => "token");
    expect(container.querySelector(".cs-empty-title")).toBeTruthy();
  });

  it("renders error state when fetch fails", async () => {
    fetch.mockRejectedValue(new Error("network"));
    await initMealHistory(container, () => "token");
    expect(container.querySelector(".cs-empty-title").textContent).toMatch(/Could not load/i);
  });

  it("renders error state when response is not ok", async () => {
    fetch.mockResolvedValue({ ok: false });
    await initMealHistory(container, () => "token");
    expect(container.querySelector(".cs-empty-title").textContent).toMatch(/Could not load/i);
  });

  it("renders date groups and meal cards for returned meals", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ meals: [makeMeal()] }),
    });
    await initMealHistory(container, () => "token");
    expect(container.querySelector(".cs-history-group")).toBeTruthy();
    expect(container.querySelector(".cs-history-meal-card")).toBeTruthy();
  });
});
