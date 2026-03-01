import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Standard JSON 429 response matching our API response shape
const handler = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
  });
};

/**
 * General limiter applied to all API routes.
 * 200 requests per 15 minutes per IP — generous enough for normal use.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: 'draft-7', // Return RateLimit-* headers (RFC draft)
  legacyHeaders: false,
  handler: handler as any,
  // Skip rate limiting for trusted proxies (set in production)
  skip: () => false,
});

/**
 * Strict limiter for auth endpoints (login, register, forgot-password).
 * 10 attempts per 15 minutes per IP prevents brute-force and credential stuffing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: handler as any,
  // Key by IP + route to prevent distributing attacks across endpoints
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${req.path}`,
});

/**
 * Analysis trigger limiter — prevent abuse of the expensive pipeline.
 * 5 analysis starts per hour per IP.
 */
export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: handler as any,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:analysis-start`,
});
