import logger from "../lib/logger.js";

export const requestLogger = async (ctx, next) => {
  const start = Date.now();
  await next();
  logger.info({
    method: ctx.req.method,
    path: new URL(ctx.req.url).pathname,
    status: ctx.res.status,
    duration: Date.now() - start,
  });
}
