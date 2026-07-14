import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { generateClientAccessToken, buildClientQuoteUrl } from '@/lib/client-links';

/**
 * Generate a signed client access link for a quote.
 * Requires authentication - only the quote owner can generate links.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId, contactId, preview = false } = await request.json();

    if (!quoteId || !contactId) {
      return NextResponse.json(
        { error: 'Missing required fields: quoteId, contactId' },
        { status: 400 }
      );
    }

    const token = generateClientAccessToken(quoteId, contactId);
    const link = buildClientQuoteUrl(quoteId, token, preview);

    return NextResponse.json({ success: true, link, token });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Generate Link] Error:', errMsg, error);
    return NextResponse.json(
      { error: 'Failed to generate link', detail: errMsg },
      { status: 500 }
    );
  }
}
