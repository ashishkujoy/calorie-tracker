import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(
  resolve(__dirname, "../../public/dashboard.html"),
  "utf-8"
);

/** Build a minimal signed-looking JWT with the given payload claims. */
const makeJwt = (claims) =>
  `header.${btoa(JSON.stringify(claims))}.sig`;

// ── Module mocks (hoisted before any import) ──────────────────────────────────

vi.mock("/js/auth.js", () => ({ getAuthState: vi.fn() }));

// Import the mock handle so tests can configure return values.
const { getAuthState } = await import("/js/auth.js");

// Import dashboard.js once; it registers window.onload using the mocked getAuthState.
await import("/js/dashboard.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capture window.location.replace without jsdom throwing on navigation. */
const mockLocation = () => {
  const replace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { replace, pathname: "/dashboard", search: "", hash: "" },
  });
  return replace;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("dashboard page", () => {
  let replaceMock;

  beforeEach(() => {
    document.documentElement.innerHTML = html;
    replaceMock = mockLocation();
    vi.clearAllMocks();
  });

  it("redirects to / when unauthenticated", async () => {
    getAuthState.mockResolvedValue({ status: "unauthenticated" });

    await window.onload();

    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("does not redirect when authenticated", async () => {
    const token = makeJwt({ name: "Alice", email: "alice@example.com", exp: 9_999_999_999 });
    getAuthState.mockResolvedValue({ status: "authenticated", token });

    await window.onload();

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows name and email from JWT when authenticated", async () => {
    const token = makeJwt({ name: "Alice", email: "alice@example.com", exp: 9_999_999_999 });
    getAuthState.mockResolvedValue({ status: "authenticated", token });

    await window.onload();

    expect(document.getElementById("user-info").textContent).toBe(
      "Alice alice@example.com"
    );
  });

  it("falls back to email when JWT has no name", async () => {
    const token = makeJwt({ email: "bob@example.com", exp: 9_999_999_999 });
    getAuthState.mockResolvedValue({ status: "authenticated", token });

    await window.onload();

    expect(document.getElementById("user-info").textContent).toBe(
      "bob@example.com bob@example.com"
    );
  });

  it("shows 'Welcome!' when the token cannot be decoded", async () => {
    getAuthState.mockResolvedValue({ status: "authenticated", token: "not.a.jwt" });

    await window.onload();

    expect(document.getElementById("user-info").textContent).toBe("Welcome!");
  });
});
