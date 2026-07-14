import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { confirmPayment, PaymentVerificationError } from '@/lib/payments/confirm';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIntentId } = await request.json();
    const result = await confirmPayment(paymentIntentId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment confirmation failed:', error);
    return NextResponse.json({ error: 'Payment confirmation failed. Please try again.' }, { status: 500 });
  }
}
