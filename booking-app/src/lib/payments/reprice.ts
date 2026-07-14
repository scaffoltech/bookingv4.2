import { TravelQuote, TravelItem } from '@/types';
import { getHotelBedsHeaders, getHotelBedsBaseUrl } from '@/lib/hotelbeds/auth';

/**
 * Reprice quote by checking current supplier rates for API-sourced items.
 * Shared by the agent and client-portal create-payment-intent routes.
 */
export async function repriceQuote(quote: TravelQuote): Promise<{
  priceChanged: boolean;
  newTotalCost: number;
  items: TravelItem[];
}> {
  let newTotalCost = 0;
  let priceChanged = false;

  const items = await Promise.all(
    quote.items.map(async (item) => {
      if (item.source === 'api' && item.apiProvider) {
        const currentPrice = await getAPICurrentPrice(item);
        if (currentPrice !== item.price) {
          priceChanged = true;
          newTotalCost += currentPrice;
          return { ...item, price: currentPrice };
        }
        newTotalCost += item.price;
        return item;
      }
      newTotalCost += item.price;
      return item;
    })
  );

  return { priceChanged, newTotalCost, items };
}

/**
 * Get current price from the supplier API.
 * For HotelBeds: uses the CheckRate API with the stored rateKey.
 * For unsupported providers: returns the stored price (no-op).
 */
export async function getAPICurrentPrice(item: TravelItem): Promise<number> {
  if (item.apiProvider === 'hotelbeds' && item.details?.rateKey) {
    try {
      const baseUrl = getHotelBedsBaseUrl();
      const headers = getHotelBedsHeaders();

      const response = await fetch(`${baseUrl}/hotel-api/1.0/checkrates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rooms: [{ rateKey: item.details.rateKey }] }),
      });

      if (response.ok) {
        const data = await response.json();
        const rate = data?.hotel?.rooms?.[0]?.rates?.[0];
        if (rate?.net) return parseFloat(rate.net);
      }

      console.warn(`[getAPICurrentPrice] HotelBeds checkrate non-OK/missing rate for item ${item.id}, using stored price`);
      return item.price;
    } catch (err) {
      console.warn(`[getAPICurrentPrice] HotelBeds checkrate failed for item ${item.id}, using stored price:`, err);
      return item.price;
    }
  }

  return item.price;
}
