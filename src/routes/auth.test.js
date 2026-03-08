import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestDb } from "../test/createTestDb.js";
import { createApp } from "../server.js";

// Mock google-auth-library
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(function () {
    this.verifyIdToken = vi.fn().mockResolvedValue({
      getPayload: () => ({
        sub: "google-uid-123",
        email: "alice@example.com",
        name: "Alice",
        picture: "https://example.com/alice.jpg",
      }),
    });
  }),
}));

// Mock fetch for Google token exchange
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let db;
let closeDb;
let app;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.JWT_EXPIRY = "15m";
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/auth/google/callback";
  process.env.FRONTEND_URL = "http://localhost:5173";

  ({ db, close: closeDb } = await createTestDb());
  app = createApp(db);
});

afterAll(async () => {
  await closeDb();
});

const mockTokenExchangeSuccess = () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id_token: "fake-id-token", access_token: "fake-access-token" }),
  });
};

const callbackRequest = (code, state, cookieState = state) =>
  app.request(`/auth/google/callback?code=${code}&state=${state}`, {
    headers: { Cookie: `oauth_state=${cookieState}` },
  });

describe("GET /auth/google", () => {
  it("redirects to Google with correct params", async () => {
    const res = await app.request("/auth/google");
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location"));
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("scope")).toContain("openid");
    expect(location.searchParams.get("state")).toBeTruthy();
  });

  it("sets the oauth_state cookie", async () => {
    const res = await app.request("/auth/google");
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("oauth_state=");
    expect(cookie).toContain("HttpOnly");
  });
});

describe("GET /auth/google/callback", () => {
  it("returns 400 when Google returns an error", async () => {
    const res = await app.request("/auth/google/callback?error=access_denied&state=abc", {
      headers: { Cookie: "oauth_state=abc" },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "access_denied" });
  });

  it("returns 400 on state mismatch", async () => {
    const res = await callbackRequest("code123", "state-from-url", "different-state-in-cookie");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_state" });
  });

  it("returns 400 when token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "invalid_grant" }),
    });
    const res = await callbackRequest("bad-code", "valid-state");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "token_exchange_failed" });
  });

  it("happy path: creates new user and redirects to frontend with token", async () => {
    mockTokenExchangeSuccess();
    const res = await callbackRequest("valid-code", "valid-state");
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("http://localhost:5173/#token=");
  });

  it("happy path: sets httpOnly Secure SameSite=Strict refresh token cookie", async () => {
    mockTokenExchangeSuccess();
    const res = await callbackRequest("valid-code", "valid-state");
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("refreshToken=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("happy path: returning user is updated, not duplicated", async () => {
    mockTokenExchangeSuccess();
    await callbackRequest("valid-code", "valid-state");
    mockTokenExchangeSuccess();
    const res = await callbackRequest("valid-code", "valid-state");
    expect(res.status).toBe(302);

    const users = await db.collection("users").find({ googleId: "google-uid-123" }).toArray();
    expect(users).toHaveLength(1);
  });
});
