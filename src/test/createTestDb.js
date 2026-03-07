import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

export const createTestDb = async () => {
  const mongod = await MongoMemoryServer.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const db = client.db();

  const close = async () => {
    await client.close();
    await mongod.stop();
  };

  return { db, close };
};
