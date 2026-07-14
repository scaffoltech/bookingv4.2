import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateClientAccessToken } from '@/lib/client-links';
import { dbRowToQuote } from '@/lib/quote-mapper';

export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const { quoteId } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Validate access token
    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    if (!validateClientAccessToken(token, quoteId)) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      );
    }

    // Fetch quote from Supabase using admin client (bypasses RLS)
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    const quote = dbRowToQuote(data);
    return NextResponse.json({ quote });
  } catch (error) {
    console.error('[Client Quote API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Client accept/reject — token-authenticated, no session (the browser
// visitor has no Supabase auth session and RLS would otherwise block this).
export async function PATCH(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const { quoteId } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const { status } = await request.json();

    if (!token || !validateClientAccessToken(token, quoteId)) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    if (status !== 'accepted' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { error } = await supabase.from('quotes').update({ status }).eq('id', quoteId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Client Quote API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
