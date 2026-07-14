import { TravelQuote } from '@/types';
import crypto from 'crypto';

const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getTokenSecret(): string {
  const secret = process.env.CLIENT_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CLIENT_TOKEN_SECRET must be set in production');
    }
    return 'dev-fallback-secret-change-in-production';
  }
  return secret;
}

/**
 * Generate an HMAC-signed client access token.
 * Format: base64url(payload).base64url(signature)
 * NOTE: This uses Node.js crypto and must only run server-side.
 */
export function generateClientAccessToken(quoteId: string, contactId: string): string {
  const payload = JSON.stringify({
    quoteId,
    contactId,
    exp: Date.now() + TOKEN_MAX_AGE_MS,
  });

  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', getTokenSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Validate an HMAC-signed client access token.
 * NOTE: This uses Node.js crypto and must only run server-side.
 */
export function validateClientAccessToken(token: string, quoteId: string): boolean {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return false;

    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', getTokenSecret()).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;

    // Decode and validate payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    if (payload.quoteId !== quoteId) return false;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Build the client link URL. Uses token generated server-side.
 */
export function buildClientQuoteUrl(quoteId: string, token: string, preview = false): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com';
  const url = `${baseUrl}/client/${quoteId}?token=${encodeURIComponent(token)}`;
  return preview ? `${url}&preview=true` : url;
}

/**
 * Server-only: Generate a full client quote link.
 */
export function generateClientQuoteLink(quote: TravelQuote): string {
  const token = generateClientAccessToken(quote.id, quote.contactId);
  return buildClientQuoteUrl(quote.id, token);
}

/**
 * Server-only: Generate a preview link.
 */
export function generatePreviewLink(quote: TravelQuote): string {
  const token = generateClientAccessToken(quote.id, quote.contactId);
  return buildClientQuoteUrl(quote.id, token, true);
}

const REFRESH_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Validate token signature only (ignores expiry).
 * Returns the decoded payload if signature is valid, null otherwise.
 */
export function validateClientTokenSignatureOnly(
  token: string,
  quoteId: string
): { quoteId: string; contactId: string; exp: number } | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', getTokenSecret()).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.quoteId !== quoteId) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the expiration timestamp from a token (does NOT verify signature).
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const [payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Check if an expired token is within the grace period for refresh.
 */
export function isWithinRefreshGracePeriod(expiry: number): boolean {
  const now = Date.now();
  return expiry < now && (now - expiry) <= REFRESH_GRACE_PERIOD_MS;
}

// Email template for sending quote links to clients
export function generateQuoteEmailTemplate(
  quote: TravelQuote,
  contactName: string,
  agentName: string,
  clientLink: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #1f2937; margin: 0;">Your Travel Quote is Ready!</h1>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${contactName},
        </p>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          I've prepared a personalized travel quote for your upcoming trip: <strong>${quote.title}</strong>
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 10px 0;">Trip Details:</h3>
          <p style="color: #6b7280; margin: 5px 0;">
            ${new Date(quote.travelDates.start).toLocaleDateString()} - ${new Date(quote.travelDates.end).toLocaleDateString()}
          </p>
          <p style="color: #6b7280; margin: 5px 0;">
            ${quote.items.length} item${quote.items.length !== 1 ? 's' : ''} included
          </p>
          <p style="color: #6b7280; margin: 5px 0;">
            Total: $${quote.totalCost.toLocaleString()}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${clientLink}"
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            View Your Quote & Book Online
          </a>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            <strong>What you can do with this link:</strong><br>
            - View detailed itinerary and pricing<br>
            - Accept or request changes to the quote<br>
            - Pay online securely (full payment or deposit)<br>
            - Message me directly with questions
          </p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          This link is secure and personalized for you. If you have any questions or would like to make changes,
          you can message me directly through the quote page or reply to this email.
        </p>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Looking forward to helping you create an amazing travel experience!
        </p>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Best regards,<br>
          <strong>${agentName}</strong>
        </p>
      </div>

      <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This link will expire in 7 days for security purposes.
          If you need a new link, please contact your travel agent.
        </p>
      </div>
    </div>
  `;
}
