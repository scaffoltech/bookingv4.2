import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { calculateSmartDepositAmount } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data: quoteData, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();

    if (quoteError || !quoteData) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('org_memberships')
      .select('id')
      .eq('org_id', quoteData.org_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
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
    console.error('[Calculate Deposit] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
