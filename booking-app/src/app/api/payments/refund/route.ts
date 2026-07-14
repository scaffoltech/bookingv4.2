import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, formatAmountForStripe, calculateRefundAmount } from '@/lib/stripe/config';
import { RefundCalculation } from '@/types/payment';
import { TravelQuote } from '@/types';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, quoteId, reason } = await request.json();

    if (!paymentId || !quoteId) {
      return NextResponse.json({ error: 'Missing required fields: paymentId, quoteId' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: payment, error: paymentError } = await supabase.from('payments').select('*').eq('id', paymentId).single();
    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { data: quoteRow, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
    if (quoteError || !quoteRow) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (payment.quote_id !== quoteId) {
      return NextResponse.json({ error: 'Payment does not belong to this quote' }, { status: 400 });
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'Payment has no associated Stripe charge' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('org_memberships')
      .select('id')
      .eq('org_id', quoteRow.org_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }

    const quote = dbRowToQuote(quoteRow);
    const refundCalculation = calculateRefundForQuote(quote);

    if (refundCalculation.refundAmount <= 0) {
      return NextResponse.json(
        {
          error: 'No refund available',
          message: 'Cancellation policy does not allow refunds at this time',
          refundPercentage: refundCalculation.refundPercentage,
        },
        { status: 400 }
      );
    }

    // Cap the refund at what was actually charged for this payment — a
    // deposit payer can only be refunded the deposit, not the full quote.
    const refundAmount = Math.min(refundCalculation.refundAmount, payment.amount);

    const stripe = getStripeInstance();

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: formatAmountForStripe(refundAmount),
      reason: 'requested_by_customer',
      metadata: {
        quoteId,
        originalAmount: payment.amount.toString(),
        refundPercentage: refundCalculation.refundPercentage.toString(),
        serviceFee: refundCalculation.serviceFee.toString(),
        reason: reason || 'Customer cancellation',
      },
    });

    await supabase.from('payments').update({ status: 'refunded' }).eq('id', paymentId);
    await supabase.from('quotes').update({ status: 'cancelled' }).eq('id', quoteId);

    if (refundCalculation.shouldClawbackCommission) {
      await clawbackAgentCommission(supabase, quoteId, refundCalculation.commissionClawback);
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      refundAmount,
      refundPercentage: refundCalculation.refundPercentage,
      serviceFee: refundCalculation.serviceFee,
      clientReceives: refundAmount - refundCalculation.serviceFee,
      breakdown: refundCalculation.breakdown,
    });
  } catch (error) {
    console.error('Refund processing failed:', error);
    return NextResponse.json({ error: 'Refund processing failed. Please try again.' }, { status: 500 });
  }
}

/**
 * Calculate refund based on each item's cancellation policy. Uses the most
 * restrictive item policy across the quote.
 */
function calculateRefundForQuote(quote: TravelQuote): RefundCalculation {
  const now = new Date();
  let minRefundPercentage = 100;
  const breakdown: RefundCalculation['breakdown'] = [];

  for (const item of quote.items) {
    let itemRefundPercentage = 0;

    if (item.cancellationPolicy) {
      const { freeCancellationUntil, refundRules, nonRefundable } = item.cancellationPolicy;

      if (nonRefundable) {
        itemRefundPercentage = 0;
      } else if (freeCancellationUntil && now < new Date(freeCancellationUntil)) {
        itemRefundPercentage = 100;
      } else if (refundRules && refundRules.length > 0) {
        const travelDate = new Date(item.startDate);
        const daysUntilTravel = Math.floor((travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const sortedRules = [...refundRules].sort((a, b) => b.daysBeforeTravel - a.daysBeforeTravel);
        for (const rule of sortedRules) {
          if (daysUntilTravel >= rule.daysBeforeTravel) {
            itemRefundPercentage = rule.refundPercentage;
            break;
          }
        }
      }
    } else {
      const travelDate = new Date(item.startDate);
      const daysUntilTravel = Math.floor((travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilTravel >= 30) itemRefundPercentage = 100;
      else if (daysUntilTravel >= 14) itemRefundPercentage = 50;
      else if (daysUntilTravel >= 7) itemRefundPercentage = 25;
      else itemRefundPercentage = 0;
    }

    minRefundPercentage = Math.min(minRefundPercentage, itemRefundPercentage);

    const itemPaidAmount = item.clientPrice || item.price;
    const itemRefundAmount = (itemPaidAmount * itemRefundPercentage) / 100;

    breakdown.push({
      itemId: item.id,
      itemName: item.name,
      paidAmount: itemPaidAmount,
      refundAmount: itemRefundAmount,
      refundPercentage: itemRefundPercentage,
    });
  }

  if (breakdown.length === 0) {
    minRefundPercentage = 0;
  }

  const totalPaid = quote.totalPaid || quote.totalCost;
  const grossRefundCalc = calculateRefundAmount(totalPaid, minRefundPercentage);

  const shouldClawbackCommission = minRefundPercentage > 0;
  const commissionClawback = shouldClawbackCommission ? totalPaid * 0.1 : 0;

  return {
    refundAmount: grossRefundCalc.clientReceives,
    refundPercentage: minRefundPercentage,
    serviceFee: grossRefundCalc.serviceFee,
    shouldClawbackCommission,
    commissionClawback,
    breakdown,
  };
}

async function clawbackAgentCommission(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  quoteId: string,
  clawbackAmount: number
) {
  const { data: commissions, error } = await supabase.from('commissions').select('*').eq('quote_id', quoteId);

  if (error || !commissions) {
    console.error('Failed to fetch commissions for clawback:', error);
    return;
  }

  for (const commission of commissions) {
    if (commission.status === 'paid' || commission.status === 'pending' || commission.status === 'approved') {
      await supabase.from('commissions').update({ status: 'disputed' }).eq('id', commission.id);
    }
  }

  console.log(`Commission clawback flagged for quote: ${quoteId}, amount: $${clawbackAmount}`);
}
