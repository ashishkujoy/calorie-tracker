import { verifyAccessToken } from "../lib/jwt.js";

export const requireAuth = async (ctx, next) => {
  const authorization = ctx.req.header("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const token = authorization.slice(7);

  try {
    const payload = verifyAccessToken(token);
    ctx.set("user", { id: payload.sub, email: payload.email, name: payload.name });
    await next();
  } catch {
    return ctx.json({ error: "Unauthorized" }, 401);
  }
};
