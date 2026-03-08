import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { createRefreshToken } from "../models/refreshToken.js";
import { ObjectId } from "mongodb";
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

const mockFetch = vi.fn();

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

  vi.stubGlobal("fetch", mockFetch);
  ({ db, close: closeDb } = await createTestDb());
  app = createApp(db);
});

afterAll(async () => {
  await closeDb();
  vi.unstubAllGlobals();
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

describe("POST /auth/refresh", () => {
  let validRawToken;
  const userId = new ObjectId();

  beforeEach(async () => {
    validRawToken = "raw-refresh-token-" + Math.random();
    await createRefreshToken(db, {
      userId,
      token: validRawToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    // ensure a user doc exists for this userId
    await db.collection("users").updateOne(
      { _id: userId },
      { $setOnInsert: { googleId: "g-refresh", email: "r@test.com", name: "Refresh User", avatarUrl: "", createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
  });

  it("returns 401 with no cookie", async () => {
    const res = await app.request("/auth/refresh", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 401 with unknown token", async () => {
    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: "refreshToken=unknown-token" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const expiredToken = "expired-token-" + Math.random();
    await createRefreshToken(db, {
      userId,
      token: expiredToken,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refreshToken=${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });

  it("happy path: returns new accessToken and rotates the cookie", async () => {
    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refreshToken=${validRawToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain("refreshToken=");
  });

  it("old token is unusable after rotation", async () => {
    await app.request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refreshToken=${validRawToken}` },
    });
    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refreshToken=${validRawToken}` },
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("returns 204 and clears cookie", async () => {
    const rawToken = "logout-token-" + Math.random();
    await createRefreshToken(db, {
      userId: new ObjectId(),
      token: rawToken,
      expiresAt: new Date(Date.now() + 1000),
    });
    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: { Cookie: `refreshToken=${rawToken}` },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("refreshToken=;");
  });

  it("returns 204 even with no cookie (idempotent)", async () => {
    const res = await app.request("/auth/logout", { method: "POST" });
    expect(res.status).toBe(204);
  });
});
