import { getStripeInstance } from './config';
import Stripe from 'stripe';

// Single plan: $49/seat/month with full feature access
export const PLAN = {
  name: 'TravelFlow',
  priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
  price: 4900,
  displayPrice: '$49',
  interval: 'month' as const,
} as const;

// Keep PLANS export for backwards compatibility during transition
export const PLANS = {
  starter: {
    name: PLAN.name,
    priceId: PLAN.priceId,
    price: PLAN.price,
    displayPrice: PLAN.displayPrice,
  },
  professional: {
    name: PLAN.name,
    priceId: PLAN.priceId,
    price: PLAN.price,
    displayPrice: PLAN.displayPrice,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  orgId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeInstance();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLAN.priceId, quantity: params.quantity || 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: params.userId, orgId: params.orgId },
    },
    metadata: { userId: params.userId, orgId: params.orgId },
    allow_promotion_codes: true,
  };

  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else {
    sessionParams.customer_email = params.email;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeInstance();
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

export async function updateSubscriptionQuantity(
  subscriptionId: string,
  newQuantity: number
): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new Error('No subscription item found');
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, quantity: newQuantity }],
    proration_behavior: 'create_prorations',
  });
}
