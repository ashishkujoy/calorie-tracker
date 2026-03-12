import { MongoClient } from "mongodb";
import logger from "./lib/logger.js";

let client;

const ensureIndexes = async (db) => {
  await db.collection("users").createIndexes([
    { key: { googleId: 1 }, unique: true },
    { key: { email: 1 }, unique: true },
  ]);
  await db.collection("refreshTokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("meals").createIndex({ userId: 1 });
};

export const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not set");
    throw new Error("MONGODB_URI is not set");
  }

  client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await ensureIndexes(db);
  logger.info("Connected to MongoDB");
  return db;
};

export const closeDb = async () => {
  if (client) {
    await client.close();
  }
};
