import { hashToken } from "../lib/jwt.js";

const col = (db) => db.collection("refreshTokens");

export const createRefreshToken = async (db, { userId, token, expiresAt }) => {
  const doc = { userId, token: hashToken(token), expiresAt, createdAt: new Date() };
  await col(db).insertOne(doc);
  return doc;
};

export const findRefreshToken = async (db, rawToken) => {
  return col(db).findOne({ token: hashToken(rawToken) });
};

export const deleteRefreshToken = async (db, rawToken) => {
  await col(db).deleteOne({ token: hashToken(rawToken) });
};
