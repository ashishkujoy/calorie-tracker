import { MongoClient } from "mongodb";
import logger from "./lib/logger.js";

let client;

export const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not set");
    throw new Error("MONGODB_URI is not set");
  }

  client = new MongoClient(uri);
  await client.connect();
  logger.info("Connected to MongoDB");
  return client.db();
}

export const closeDb = async () => {
  if (client) {
    await client.close();
  }
};
