/**
 * Browser-safe client link utilities.
 * Calls the server API to generate signed tokens (crypto runs server-side only).
 */

export async function fetchClientLink(
  quoteId: string,
  contactId: string,
  preview = false
): Promise<string | null> {
  try {
    const response = await fetch('/api/client/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, contactId, preview }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'no body');
      console.error('[fetchClientLink] API returned', response.status, errorBody);
      return null;
    }

    const data = await response.json();
    return data.link || null;
  } catch (err) {
    console.error('[fetchClientLink] Network/fetch error:', err);
    return null;
  }
}
