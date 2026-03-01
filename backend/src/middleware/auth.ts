import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';
import { unauthorized } from '../utils/response';

interface JwtPayload {
  userId: string;
  role: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    unauthorized(res, 'No token provided');
    return;
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'ADMIN') {
      unauthorized(res, 'Admin access required');
      return;
    }
    next();
  });
}
