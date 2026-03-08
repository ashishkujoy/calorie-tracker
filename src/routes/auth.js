import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { upsertUser, findUserById } from "../models/user.js";
import { createRefreshToken, findRefreshToken, deleteRefreshToken } from "../models/refreshToken.js";
import { signAccessToken, generateRefreshToken } from "../lib/jwt.js";
import logger from "../lib/logger.js";

const router = new Hono();

const STATE_COOKIE = "oauth_state";
const REFRESH_COOKIE = "refreshToken";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// --- helpers ---

const buildGoogleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const exchangeCodeForTokens = async (code) => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error("token_exchange_failed"), { data });
  return data;
};

const verifyGoogleIdToken = async (idToken) => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

const issueSession = async (db, { sub, email, name, picture }) => {
  const user = await upsertUser(db, { googleId: sub, email, name, avatarUrl: picture });
  const accessToken = signAccessToken({ id: user._id.toString(), email, name });
  const rawRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createRefreshToken(db, { userId: user._id, token: rawRefreshToken, expiresAt });
  return { accessToken, rawRefreshToken, expiresAt };
};

const setRefreshCookie = (ctx, token, expires) => {
  setCookie(ctx, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    expires,
    path: "/",
  });
};

const lookupValidRefreshToken = async (db, rawToken) => {
  const doc = await findRefreshToken(db, rawToken);
  if (!doc || doc.expiresAt < new Date()) return null;
  return doc;
};

const rotateRefreshToken = async (db, oldRawToken, userId) => {
  const user = await findUserById(db, userId.toString());
  await deleteRefreshToken(db, oldRawToken);
  const accessToken = signAccessToken({ id: user._id.toString(), email: user.email, name: user.name });
  const rawRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createRefreshToken(db, { userId: user._id, token: rawRefreshToken, expiresAt });
  return { accessToken, rawRefreshToken, expiresAt };
};

const clearRefreshCookie = (ctx) => {
  deleteCookie(ctx, REFRESH_COOKIE, { path: "/" });
};

// --- routes ---

router.get("/google", (ctx) => {
  const state = randomBytes(16).toString("hex");
  setCookie(ctx, STATE_COOKIE, state, { httpOnly: true, sameSite: "Lax", maxAge: 60 * 10, path: "/" });
  return ctx.redirect(buildGoogleAuthUrl(state));
});

router.get("/google/callback", async (ctx) => {
  const { code, state, error } = ctx.req.query();

  if (error) {
    logger.warn({ error }, "Google OAuth error");
    return ctx.json({ error }, 400);
  }

  const storedState = getCookie(ctx, STATE_COOKIE);
  if (!storedState || storedState !== state) {
    return ctx.json({ error: "invalid_state" }, 400);
  }
  deleteCookie(ctx, STATE_COOKIE);

  let tokenData;
  try {
    tokenData = await exchangeCodeForTokens(code);
  } catch (err) {
    logger.warn({ err }, "Google token exchange failed");
    return ctx.json({ error: "token_exchange_failed" }, 400);
  }

  const profile = await verifyGoogleIdToken(tokenData.id_token);
  const { accessToken, rawRefreshToken, expiresAt } = await issueSession(ctx.get("db"), profile);

  setRefreshCookie(ctx, rawRefreshToken, expiresAt);
  return ctx.redirect(`${process.env.FRONTEND_URL}/#token=${accessToken}`);
});

router.post("/refresh", async (ctx) => {
  const rawToken = getCookie(ctx, REFRESH_COOKIE);
  if (!rawToken) return ctx.json({ error: "missing_token" }, 401);

  const doc = await lookupValidRefreshToken(ctx.get("db"), rawToken);
  if (!doc) return ctx.json({ error: "invalid_token" }, 401);

  const { accessToken, rawRefreshToken, expiresAt } = await rotateRefreshToken(ctx.get("db"), rawToken, doc.userId);
  setRefreshCookie(ctx, rawRefreshToken, expiresAt);
  return ctx.json({ accessToken });
});

router.post("/logout", async (ctx) => {
  const rawToken = getCookie(ctx, REFRESH_COOKIE);
  if (rawToken) await deleteRefreshToken(ctx.get("db"), rawToken);
  clearRefreshCookie(ctx);
  return ctx.body(null, 204);
});

export default router;
