import { ObjectId } from "mongodb";

const col = (db) => db.collection("users");

export const upsertUser = async (db, { googleId, email, name, avatarUrl }) => {
  const now = new Date();
  const doc = await col(db).findOneAndUpdate(
    { googleId },
    {
      $set: { email, name, avatarUrl, updatedAt: now },
      $setOnInsert: { googleId, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  return doc;
};

export const findUserById = async (db, id) => {
  return col(db).findOne({ _id: new ObjectId(id) });
};
