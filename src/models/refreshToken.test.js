import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ObjectId } from "mongodb";
import { createTestDb } from "../test/createTestDb.js";
import { createRefreshToken, findRefreshToken, deleteRefreshToken } from "./refreshToken.js";

let db;
let closeDb;
const userId = new ObjectId();
const rawToken = "super-secret-raw-token";

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});

afterAll(async () => {
  await closeDb();
});

describe("createRefreshToken", () => {
  it("stores a hashed token doc", async () => {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    const doc = await createRefreshToken(db, { userId, token: rawToken, expiresAt });
    expect(doc.token).not.toBe(rawToken);
    expect(doc.token).toHaveLength(64); // SHA-256 hex
    expect(doc.userId.toString()).toBe(userId.toString());
  });
});

describe("findRefreshToken", () => {
  it("finds a token by raw value", async () => {
    const found = await findRefreshToken(db, rawToken);
    expect(found).not.toBeNull();
  });

  it("returns null for an unknown token", async () => {
    const result = await findRefreshToken(db, "unknown-token");
    expect(result).toBeNull();
  });
});

describe("deleteRefreshToken", () => {
  it("removes the token", async () => {
    await deleteRefreshToken(db, rawToken);
    const result = await findRefreshToken(db, rawToken);
    expect(result).toBeNull();
  });

  it("is idempotent — no error if token does not exist", async () => {
    await expect(deleteRefreshToken(db, "non-existent")).resolves.not.toThrow();
  });
});
