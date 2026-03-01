import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.issues.map((e) => ({ path: e.path.map(String).join('.'), message: e.message })),
    });
    return;
  }

  // Log unexpected errors server-side only
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  if (config.isDev) console.error(err.stack);

  // In production, never leak internal error details or stack traces to the client
  res.status(500).json({
    success: false,
    error: config.isDev ? err.message : 'Internal server error',
    // Stack traces are intentionally omitted even in dev API responses
  });
}
