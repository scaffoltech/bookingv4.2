import { NextRequest, NextResponse } from 'next/server';
import { validateClientAccessToken } from '@/lib/client-links';
import { calculateSmartDepositAmount } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';

export async function POST(request: NextRequest) {
  try {
    const { quoteId, token } = await request.json();

    if (!token || !quoteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateClientAccessToken(token, quoteId)) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    const supabase = await createAdminClient();
    const { data: quoteData, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();

    if (quoteError || !quoteData) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = dbRowToQuote(quoteData);
    const depositAmount = calculateSmartDepositAmount(quote);

    return NextResponse.json({
      success: true,
      depositAmount,
      totalCost: quote.totalCost,
      balanceAmount: quote.totalCost - depositAmount,
    });
  } catch (error) {
    console.error('[Client Calculate Deposit] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
