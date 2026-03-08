import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../test/createTestDb.js";
import { upsertUser, findUserById } from "./user.js";

let db;
let closeDb;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});

afterAll(async () => {
  await closeDb();
});

describe("upsertUser", () => {
  it("creates a new user and returns the doc", async () => {
    const user = await upsertUser(db, {
      googleId: "g1",
      email: "a@example.com",
      name: "Alice",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(user.googleId).toBe("g1");
    expect(user.email).toBe("a@example.com");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("updates an existing user on subsequent call", async () => {
    await upsertUser(db, { googleId: "g2", email: "b@example.com", name: "Bob", avatarUrl: "" });
    const updated = await upsertUser(db, { googleId: "g2", email: "b@example.com", name: "Bob Updated", avatarUrl: "" });
    expect(updated.name).toBe("Bob Updated");
  });
});

describe("findUserById", () => {
  it("returns the user for a valid id", async () => {
    const created = await upsertUser(db, {
      googleId: "g3",
      email: "c@example.com",
      name: "Carol",
      avatarUrl: "",
    });
    const found = await findUserById(db, created._id.toString());
    expect(found._id.toString()).toBe(created._id.toString());
  });

  it("returns null for an unknown id", async () => {
    const result = await findUserById(db, "000000000000000000000000");
    expect(result).toBeNull();
  });
});
