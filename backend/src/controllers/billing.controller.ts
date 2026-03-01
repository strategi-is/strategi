import { Request, Response } from 'express';
import { billingService } from '../services/billing.service';
import { AuthenticatedRequest } from '../types';
import { ok, badRequest, unauthorized } from '../utils/response';

export const billingController = {
  async getStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const status = await billingService.getSubscriptionStatus(req.userId);
    return ok(res, status);
  },

  async checkout(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    try {
      const url = await billingService.createCheckoutSession(req.userId);
      return ok(res, { url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create checkout session';
      return badRequest(res, msg);
    }
  },

  async portal(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    try {
      const url = await billingService.createPortalSession(req.userId);
      return ok(res, { url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create portal session';
      return badRequest(res, msg);
    }
  },

  // Must be registered with express.raw() — not express.json()
  async webhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing stripe-signature header' });
    }

    try {
      const event = billingService.constructWebhookEvent(req.body as Buffer, sig);
      await billingService.handleWebhookEvent(event);
      return res.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      console.error('[Billing] Webhook error:', msg);
      return res.status(400).json({ success: false, message: msg });
    }
  },
};
