import { describe, it, expect, beforeAll } from "vitest";
import { signAccessToken } from "../lib/jwt.js";
import { createApp } from "../server.js";

let app;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.JWT_EXPIRY = "15m";
  app = createApp(null);
});

const validToken = () =>
  signAccessToken({ id: "user-1", email: "u@example.com", name: "User" });

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

describe("GET /stats", () => {
  it("returns 401 without a token", async () => {
    const res = await app.request("/stats");
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid token", async () => {
    const res = await app.request("/stats", authHeader(validToken()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stats: {} });
  });
});
