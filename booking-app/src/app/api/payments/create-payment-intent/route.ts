import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, formatAmountForStripe, calculateSmartDepositAmount } from '@/lib/stripe/config';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';
import { repriceQuote } from '@/lib/payments/reprice';
import { TravelQuote } from '@/types';
import type { Json } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId, paymentType } = await request.json();

    if (!quoteId || !paymentType || (paymentType !== 'full' && paymentType !== 'deposit')) {
      return NextResponse.json(
        { error: "Missing/invalid required fields: quoteId, paymentType ('full' | 'deposit')" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Load the quote from the DB — the client never supplies pricing data.
    const { data: quoteRow, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (quoteError || !quoteRow) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const orgId: string = quoteRow.org_id;

    const { data: membership } = await supabase
      .from('org_memberships')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }

    if (!quoteRow.contact_id) {
      return NextResponse.json({ error: 'Quote has no contact assigned' }, { status: 400 });
    }
    const { data: contact } = await supabase.from('contacts').select('email').eq('id', quoteRow.contact_id).single();
    const customerEmail = contact?.email;
    if (!customerEmail) {
      return NextResponse.json({ error: 'Quote contact has no email on file' }, { status: 400 });
    }

    let quote: TravelQuote = dbRowToQuote(quoteRow);

    // Reprice API items against live supplier rates before charging.
    const repriceResult = await repriceQuote(quote);

    if (repriceResult.priceChanged) {
      // Persist the repriced items/total so the reprice sticks even if the
      // customer doesn't immediately retry — the next attempt (or this same
      // one, on accept) will see the corrected numbers.
      await supabase
        .from('quotes')
        .update({ items: repriceResult.items as unknown as Json, total_amount: repriceResult.newTotalCost })
        .eq('id', quoteId);

      return NextResponse.json(
        {
          error: 'PRICE_CHANGED',
          message: 'Quote price has changed. Please review and confirm.',
          originalPrice: quote.totalCost,
          newPrice: repriceResult.newTotalCost,
          priceDifference: repriceResult.newTotalCost - quote.totalCost,
          percentageChange: ((repriceResult.newTotalCost - quote.totalCost) / quote.totalCost) * 100,
        },
        { status: 409 }
      );
    }

    const paymentAmount = paymentType === 'deposit' ? calculateSmartDepositAmount(quote) : quote.totalCost;

    const stripe = getStripeInstance();

    let customer;
    try {
      const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      customer =
        existingCustomers.data[0] ||
        (await stripe.customers.create({
          email: customerEmail,
          metadata: { quoteId, customerId: quoteRow.contact_id || 'guest' },
        }));
    } catch {
      return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(paymentAmount),
        currency: 'usd',
        customer: customer.id,
        metadata: {
          quoteId,
          orgId,
          paymentType,
          customerId: quoteRow.contact_id || 'guest',
          quoteTitle: quote.title,
          expectedAmount: paymentAmount.toFixed(2),
        },
        description: `${paymentType === 'deposit' ? 'Deposit' : 'Full payment'} for ${quote.title}`,
        automatic_payment_methods: { enabled: true },
      });

      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentAmount,
        paymentType,
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Failed to create payment intent: ' + error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Payment intent creation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
