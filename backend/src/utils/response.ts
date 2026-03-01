import { Response } from 'express';
import { ApiResponse } from '../types';

export function ok<T>(res: Response, data: T, message?: string): Response {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message?: string): Response {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function badRequest(res: Response, error: string): Response {
  return res.status(400).json({ success: false, error });
}

export function unauthorized(res: Response, error = 'Unauthorized'): Response {
  return res.status(401).json({ success: false, error });
}

export function forbidden(res: Response, error = 'Forbidden'): Response {
  return res.status(403).json({ success: false, error });
}

export function notFound(res: Response, error = 'Not found'): Response {
  return res.status(404).json({ success: false, error });
}

export function serverError(res: Response, error = 'Internal server error'): Response {
  return res.status(500).json({ success: false, error });
}
