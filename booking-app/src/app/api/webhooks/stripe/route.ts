import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/server';
import { confirmPayment, PaymentVerificationError } from '@/lib/payments/confirm';
import Stripe from 'stripe';

async function resolveOrgFromCustomer(supabase: Awaited<ReturnType<typeof createAdminClient>>, customerId: string) {
  const { data } = await supabase.from('organizations').select('id').eq('stripe_customer_id', customerId).single();
  return data?.id;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripeInstance();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  try {
    switch (event.type) {
      // Confirms the booking/invoice/commission fan-out even if the
      // customer's browser never called /confirm-payment (closed tab, etc).
      // confirmPayment() is idempotent, so this is safe to run alongside it.
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        try {
          await confirmPayment(paymentIntent.id, null);
        } catch (err) {
          if (err instanceof PaymentVerificationError) {
            console.error(`[Webhook] confirmPayment rejected ${paymentIntent.id}: ${err.message}`);
          } else {
            throw err;
          }
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const customerId = session.customer as string;

        if (orgId && customerId) {
          await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subItem = subscription.items.data[0];
        const priceId = subItem?.price.id;
        const quantity = subItem?.quantity || 1;

        let orgId: string | undefined = subscription.metadata?.orgId;
        if (!orgId) {
          orgId = await resolveOrgFromCustomer(supabase, customerId);
        }
        const userId = subscription.metadata?.userId;

        if (orgId) {
          const { error: upsertError } = await supabase.from('subscriptions').upsert(
            {
              user_id: userId || null,
              org_id: orgId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              plan: 'starter',
              status: subscription.status,
              seat_count: quantity,
              current_period_start: subItem ? new Date(subItem.current_period_start * 1000).toISOString() : null,
              current_period_end: subItem ? new Date(subItem.current_period_end * 1000).toISOString() : null,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
              canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id' }
          );

          if (upsertError) {
            console.error('Failed to upsert subscription:', upsertError);
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const orgId = await resolveOrgFromCustomer(supabase, customerId);

        if (orgId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('org_id', orgId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const orgId = await resolveOrgFromCustomer(supabase, customerId);

        if (orgId) {
          await supabase.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('org_id', orgId);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
