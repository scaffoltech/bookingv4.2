// Amadeus test-environment flight search (server-side only)
// ponytail: test API base URL hardcoded; switch to env var when going to production Amadeus

const AMADEUS_BASE = 'https://test.api.amadeus.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!key || !secret) throw new Error('Amadeus credentials not configured');

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    }),
  });
  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface SimplifiedFlightOffer {
  carrier: string;
  flightNumbers: string[];
  depart: string; // ISO datetime, first segment departure
  arrive: string; // ISO datetime, last segment arrival
  duration: string; // e.g. "PT8H25M"
  stops: number;
  price: number;
  currency: string;
}

export async function searchFlights(params: {
  origin: string; // IATA code
  destination: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults?: number;
}): Promise<SimplifiedFlightOffer[] | { error: string }> {
  try {
    const token = await getToken();
    const query = new URLSearchParams({
      originLocationCode: params.origin.toUpperCase(),
      destinationLocationCode: params.destination.toUpperCase(),
      departureDate: params.departureDate,
      adults: String(params.adults ?? 1),
      max: '5',
      currencyCode: 'USD',
    });
    if (params.returnDate) query.set('returnDate', params.returnDate);

    const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { error: `Amadeus search failed (${res.status}): ${body.slice(0, 300)}` };
    }
    const data = await res.json();

    return (data.data ?? []).slice(0, 5).map((offer: any) => {
      const itinerary = offer.itineraries[0];
      const segments = itinerary.segments;
      return {
        carrier: segments[0].carrierCode,
        flightNumbers: segments.map((s: any) => `${s.carrierCode}${s.number}`),
        depart: segments[0].departure.at,
        arrive: segments[segments.length - 1].arrival.at,
        duration: itinerary.duration,
        stops: segments.length - 1,
        price: parseFloat(offer.price.grandTotal),
        currency: offer.price.currency,
      };
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Flight search failed' };
  }
}
