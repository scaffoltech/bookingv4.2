import { NextRequest, NextResponse } from 'next/server';
import {
  validateClientTokenSignatureOnly,
  validateClientAccessToken,
  generateClientAccessToken,
  buildClientQuoteUrl,
  getTokenExpiry,
  isWithinRefreshGracePeriod,
} from '@/lib/client-links';

export async function POST(request: NextRequest) {
  try {
    const { token, quoteId } = await request.json();

    if (!token || !quoteId) {
      return NextResponse.json(
        { error: 'Missing required fields: token, quoteId' },
        { status: 400 }
      );
    }

    // If the token is still valid, no refresh needed
    if (validateClientAccessToken(token, quoteId)) {
      const expiry = getTokenExpiry(token);
      return NextResponse.json({
        token,
        link: buildClientQuoteUrl(quoteId, token),
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
        refreshed: false,
      });
    }

    // Token is expired or invalid — verify signature to allow refresh
    const payload = validateClientTokenSignatureOnly(token, quoteId);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token signature' },
        { status: 401 }
      );
    }

    // Only allow refresh within grace period
    if (!isWithinRefreshGracePeriod(payload.exp)) {
      return NextResponse.json(
        { error: 'Token expired beyond refresh grace period. Please request a new link from your agent.' },
        { status: 401 }
      );
    }

    // Issue a fresh token
    const newToken = generateClientAccessToken(payload.quoteId, payload.contactId);
    const newExpiry = getTokenExpiry(newToken);

    return NextResponse.json({
      token: newToken,
      link: buildClientQuoteUrl(quoteId, newToken),
      expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
      refreshed: true,
    });
  } catch (error) {
    console.error('Token refresh failed:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
