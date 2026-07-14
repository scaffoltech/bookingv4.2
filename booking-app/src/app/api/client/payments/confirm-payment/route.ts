import { NextRequest, NextResponse } from 'next/server';
import { validateClientAccessToken } from '@/lib/client-links';
import { confirmPayment, PaymentVerificationError } from '@/lib/payments/confirm';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, quoteId, token } = await request.json();

    if (!token || !quoteId || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateClientAccessToken(token, quoteId)) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    const result = await confirmPayment(paymentIntentId, null, quoteId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Client Confirm Payment] Error:', error);
    return NextResponse.json({ error: 'Payment confirmation failed. Please try again.' }, { status: 500 });
  }
}
