import { useQuery } from '@tanstack/react-query';
import { TravelQuote, Contact } from '@/types';

interface ClientQuoteResponse {
  quote: TravelQuote;
}

interface ClientContactResponse {
  contact: Contact;
}

async function fetchClientQuote(
  quoteId: string,
  token: string
): Promise<TravelQuote> {
  const response = await fetch(
    `/api/client/quotes/${quoteId}?token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch quote');
  }

  const data: ClientQuoteResponse = await response.json();
  return data.quote;
}

async function fetchClientContact(
  contactId: string,
  quoteId: string,
  token: string
): Promise<Contact> {
  const response = await fetch(
    `/api/client/contacts/${contactId}?token=${encodeURIComponent(token)}&quoteId=${encodeURIComponent(quoteId)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch contact');
  }

  const data: ClientContactResponse = await response.json();
  return data.contact;
}

export function useClientQuoteQuery(quoteId: string, token: string | null) {
  return useQuery({
    queryKey: ['clientQuote', quoteId, token],
    queryFn: () => fetchClientQuote(quoteId, token!),
    enabled: !!token && !!quoteId,
    retry: false,
    refetchInterval: (query) => {
      const quote = query.state.data;
      if (!quote) return false;
      const isPaid = quote.paymentStatus === 'paid_in_full';
      const isBooked = quote.status === 'booked';
      return (isPaid && !isBooked) ? 3000 : false;
    },
  });
}

export function useClientContactQuery(
  contactId: string | undefined,
  quoteId: string,
  token: string | null
) {
  return useQuery({
    queryKey: ['clientContact', contactId, token],
    queryFn: () => fetchClientContact(contactId!, quoteId, token!),
    enabled: !!token && !!contactId,
    retry: false,
  });
}
