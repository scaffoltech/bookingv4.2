import { NextRequest, NextResponse } from 'next/server';
import { validateClientAccessToken } from '@/lib/client-links';
import { getStripeInstance, formatAmountForStripe, calculateSmartDepositAmount } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';
import { repriceQuote } from '@/lib/payments/reprice';
import type { Json } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { quoteId, paymentType, token } = await request.json();

    if (!token || !quoteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateClientAccessToken(token, quoteId)) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    if (!paymentType || (paymentType !== 'full' && paymentType !== 'deposit')) {
      return NextResponse.json({ error: "Invalid paymentType ('full' | 'deposit')" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data: quoteRow, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (quoteError || !quoteRow) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (!quoteRow.contact_id) {
      return NextResponse.json({ error: 'Quote has no contact assigned' }, { status: 400 });
    }
    const { data: contact } = await supabase.from('contacts').select('email').eq('id', quoteRow.contact_id).single();
    const customerEmail = contact?.email;
    if (!customerEmail) {
      return NextResponse.json({ error: 'Quote contact has no email on file' }, { status: 400 });
    }

    const quote = dbRowToQuote(quoteRow);
    const repriceResult = await repriceQuote(quote);

    if (repriceResult.priceChanged) {
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
          metadata: { quoteId, customerId: quote.contactId || 'guest' },
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
          orgId: quoteRow.org_id,
          paymentType,
          customerId: quote.contactId || 'guest',
          quoteTitle: quote.title,
          expectedAmount: paymentAmount.toFixed(2),
          clientPortal: 'true',
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
    } catch {
      return NextResponse.json({ error: 'Payment processing failed. Please try again.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Client Create Payment Intent] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
