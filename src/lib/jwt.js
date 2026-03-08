import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

export const signAccessToken = ({ id, email, name }) =>
  jwt.sign({ sub: id, email, name }, secret(), {
    expiresIn: process.env.JWT_EXPIRY ?? "15m",
  });

export const verifyAccessToken = (token) => jwt.verify(token, secret());

export const generateRefreshToken = () => randomBytes(32).toString("hex");

export const hashToken = (rawToken) =>
  createHash("sha256").update(rawToken).digest("hex");
