import Stripe from 'stripe';
import { prisma } from '../prisma/client';
import { config } from '../config';

// Lazy-init so missing key in dev doesn't crash the server at startup
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!config.stripe.secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2026-01-28.clover' });
  }
  return _stripe;
}

class BillingService {
  // ── Customer ──────────────────────────────────────────────────────────────

  async getOrCreateCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) throw new Error('User not found');

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  async createCheckoutSession(userId: string): Promise<string> {
    if (!config.stripe.priceId) throw new Error('STRIPE_PRICE_ID not configured');

    const customerId = await this.getOrCreateCustomer(userId);

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: config.stripe.priceId, quantity: 1 }],
      success_url: `${config.frontendUrl}/settings?billing=success`,
      cancel_url: `${config.frontendUrl}/settings?billing=canceled`,
      metadata: { userId },
    });

    return session.url!;
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  async createPortalSession(userId: string): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId);

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.frontendUrl}/settings`,
    });

    return session.url;
  }

  // ── Status ────────────────────────────────────────────────────────────────

  async getSubscriptionStatus(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionCurrentPeriodEnd: true,
      },
    });
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  constructWebhookEvent(payload: Buffer, sig: string): Stripe.Event {
    if (!config.stripe.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }
    return getStripe().webhooks.constructEvent(payload, sig, config.stripe.webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        await this.syncSubscription(session.subscription as string);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        await this.syncSubscription(sub.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.cancelSubscription(sub.customer as string);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.markPastDue(invoice.customer as string);
        break;
      }
      default:
        // Unhandled event — no-op
        break;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async syncSubscription(subscriptionId: string): Promise<void> {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    const customerId = sub.customer as string;
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;

    const status = this.mapStatus(sub.status);
    const plan = (sub.items.data[0]?.price as Stripe.Price)?.nickname ?? 'pro';
    // In Stripe API 2026-01-28.clover, current_period_end moved to the item level
    const periodEnd = new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: plan,
        subscriptionCurrentPeriodEnd: periodEnd,
      },
    });
  }

  private async cancelSubscription(customerId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: 'CANCELED', subscriptionPlan: null },
    });
  }

  private async markPastDue(customerId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: 'PAST_DUE' },
    });
  }

  private mapStatus(stripeStatus: string): 'FREE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'ACTIVE';
      case 'past_due':
      case 'unpaid':
        return 'PAST_DUE';
      case 'canceled':
      case 'incomplete_expired':
        return 'CANCELED';
      default:
        return 'FREE';
    }
  }
}

export const billingService = new BillingService();
