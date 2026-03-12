import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Module mocks (hoisted before any import) ──────────────────────────────────

vi.mock("/js/auth.js", () => ({
  getAuthState: vi.fn(),
  getStoredToken: vi.fn().mockReturnValue("test-token"),
}));

const { initMealScan } = await import("/js/meal-scan.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeFile = (sizeBytes = 100, name = "meal.jpg") =>
  new File([new Uint8Array(sizeBytes)], name, { type: "image/jpeg" });

const selectFile = (container, file) => {
  const input = container.querySelector("input[type='file']");
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change"));
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("meal-scan module", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.stubGlobal("fetch", vi.fn());
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    vi.clearAllMocks();
    initMealScan(container);
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
  });

  it("[T006] mounts a Choose Image button inside the container", () => {
    const btn = container.querySelector(".cs-choose-btn");
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain("Choose Image");
  });

  it("[T007] selecting a file shows an image preview", () => {
    selectFile(container, makeFile());

    const preview = container.querySelector(".cs-preview-zone");
    expect(preview).toBeTruthy();
    const img = container.querySelector(".cs-preview-img");
    expect(img).toBeTruthy();
    expect(img.src).toBe("blob:mock-url");
  });

  it("[T008] clicking Upload posts to /meals/scan-and-record with correct args", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          meal: { name: "Test", items: [], totals: { calories_kcal: 0, protein_g: 0, fat_g: 0, carbohydrates_g: 0 } },
        }),
    });

    selectFile(container, makeFile());
    container.querySelector(".cs-upload-btn").click();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/meals/scan-and-record");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("[T009] successful fetch renders meal name and at least one item row", async () => {
    const mockMeal = {
      mealName: "Grilled Chicken",
      items: [{ name: "Chicken", quantity: "150g", nutrition: { calories_kcal: 248, protein_g: 46.5, fat_g: 5.4, carbohydrates_g: 0, fiber_g: 0, sugar_g: 0 } }],
      totals: { calories_kcal: 248, protein_g: 46.5, fat_g: 5.4, carbohydrates_g: 0 },
    };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ meal: mockMeal }),
    });

    selectFile(container, makeFile());
    container.querySelector(".cs-upload-btn").click();

    await vi.waitFor(() => {
      const nameEl = container.querySelector(".cs-result-name");
      if (!nameEl) throw new Error("cs-result-name not rendered yet");
      expect(nameEl.textContent).toBe("Grilled Chicken");
      const tbody = container.querySelector(".cs-result-table tbody");
      expect(tbody.children.length).toBe(1);
    });
  });

  it("[T019] network error shows error message and a Try Again button", async () => {
    fetch.mockRejectedValue(new Error("Network failure"));

    selectFile(container, makeFile());
    container.querySelector(".cs-upload-btn").click();

    await vi.waitFor(() => {
      const zone = container.querySelector(".cs-error-zone");
      if (!zone) throw new Error("error zone not rendered yet");
      expect(container.querySelector(".cs-error-msg").textContent).toBeTruthy();
      expect(container.querySelector(".cs-retry-btn")).toBeTruthy();
    });
  });

  it("[T020] selecting a file larger than 10 MB shows a size error immediately", () => {
    const oversized = makeFile(10 * 1024 * 1024 + 1);
    selectFile(container, oversized);

    expect(container.querySelector(".cs-error-zone")).toBeTruthy();
    expect(container.querySelector(".cs-error-msg").textContent).toMatch(/10 MB/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
