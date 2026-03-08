import { describe, it, expect, beforeAll } from "vitest";
import { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken } from "./jwt.js";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
  process.env.JWT_EXPIRY = "15m";
});

const user = { id: "abc123", email: "user@example.com", name: "Test User" };

describe("signAccessToken / verifyAccessToken", () => {
  it("roundtrip: signed token verifies with correct claims", () => {
    const token = signAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
  });

  it("throws on expired token", async () => {
    const token = jwt_sign_expired(user);
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("throws on tampered token", () => {
    const token = signAccessToken(user);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("throws on malformed input", () => {
    expect(() => verifyAccessToken("not.a.jwt")).toThrow();
  });
});

describe("generateRefreshToken", () => {
  it("returns a hex string of at least 32 bytes (64 hex chars)", () => {
    const token = generateRefreshToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it("returns a different value each call", () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    expect(hashToken("foo")).toBe(hashToken("foo"));
  });

  it("returns a 64-char hex string (SHA-256)", () => {
    expect(hashToken("foo")).toHaveLength(64);
  });
});

// helper: sign a token that is already expired
import jwt from "jsonwebtoken";
const jwt_sign_expired = (user) =>
  jwt.sign({ sub: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: -1,
  });
