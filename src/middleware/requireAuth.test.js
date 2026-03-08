import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { signAccessToken } from "../lib/jwt.js";
import { requireAuth } from "./requireAuth.js";

let app;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.JWT_EXPIRY = "15m";

  app = new Hono();
  app.get("/protected", requireAuth, (ctx) => {
    return ctx.json({ user: ctx.get("user") });
  });
});

const validToken = () =>
  signAccessToken({ id: "user-1", email: "u@example.com", name: "User" });

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

describe("requireAuth", () => {
  it("passes through and populates ctx.get('user') with a valid token", async () => {
    const res = await app.request("/protected", authHeader(validToken()));
    expect(res.status).toBe(200);
    const { user } = await res.json();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("u@example.com");
    expect(user.name).toBe("User");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  it("returns 401 when header has no Bearer prefix", async () => {
    const res = await app.request("/protected", {
      headers: { Authorization: validToken() },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired token", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const expired = jwt.sign(
      { sub: "user-1", email: "u@example.com", name: "User" },
      process.env.JWT_SECRET,
      { expiresIn: -1 },
    );
    const res = await app.request("/protected", authHeader(expired));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a tampered token", async () => {
    const tampered = validToken().slice(0, -5) + "XXXXX";
    const res = await app.request("/protected", authHeader(tampered));
    expect(res.status).toBe(401);
  });
});
