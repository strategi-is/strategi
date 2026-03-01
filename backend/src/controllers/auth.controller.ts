import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { AuthenticatedRequest } from '../types';
import { ok, created, badRequest, unauthorized } from '../utils/response';
import { param } from '../utils/params';

// .strict() rejects any unexpected fields — prevents parameter pollution
const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    name: z.string().trim().min(1).max(100),
    companyName: z.string().trim().min(1).max(200),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

const forgotSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

const resetSchema = z
  .object({
    token: z.string().min(1).max(512),
    password: z.string().min(8).max(128),
  })
  .strict();

export const authController = {
  async register(req: Request, res: Response) {
    const { email, password, name, companyName } = registerSchema.parse(req.body);

    try {
      const { user, verifyToken } = await authService.register(email, password, name, companyName);
      emailService.sendVerificationEmail(email, name, verifyToken).catch(() => {});
      return created(res, user, 'Account created. Please verify your email.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return badRequest(res, msg);
    }
  },

  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);

    try {
      const result = await authService.login(email, password);
      return ok(res, result, 'Login successful');
    } catch {
      // Generic message — do not reveal whether email exists or password is wrong
      return unauthorized(res, 'Invalid credentials');
    }
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    const token = req.headers.authorization?.slice(7);
    if (token) await authService.logout(token);
    return ok(res, null, 'Logged out successfully');
  },

  async verifyEmail(req: Request, res: Response) {
    try {
      await authService.verifyEmail(param(req, 'token'));
      return ok(res, null, 'Email verified successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      return badRequest(res, msg);
    }
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = forgotSchema.parse(req.body);
    const result = await authService.forgotPassword(email);
    if (result) {
      emailService.sendPasswordResetEmail(email, result.name, result.resetToken).catch(() => {});
    }
    // Always return 200 — do not reveal whether the email exists
    return ok(res, null, 'If that email exists, a reset link has been sent.');
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = resetSchema.parse(req.body);
    try {
      await authService.resetPassword(token, password);
      return ok(res, null, 'Password reset successfully. Please log in.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      return badRequest(res, msg);
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const user = await authService.getMe(req.userId);
    if (!user) return unauthorized(res, 'User not found');
    return ok(res, user);
  },
};
