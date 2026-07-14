import { TravelQuote, TravelItem, CalendarEvent } from '@/types';
import { useQuotesQuery } from '@/hooks/queries/useQuotesQuery';
import { useQuoteMutations } from '@/hooks/mutations/useQuoteMutations';
import { useCurrentQuoteStore } from '@/store/current-quote-store';
import { fetchClientLink } from '@/lib/client-links-browser';

interface QuoteStats {
  totalQuotes: number;
  draftQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  bookedQuotes: number;
  cancelledQuotes: number;
  totalRevenue: number;
  averageQuoteValue: number;
}

// ponytail: drop-in replacement for the old localStorage quote-store, backed
// by Supabase via React Query. addQuote/duplicateQuote are now async (the
// old store returned an id synchronously) — callers must await them.
export function useQuoteCompat() {
  const { data: quotes = [] } = useQuotesQuery();
  const mutations = useQuoteMutations();
  const { currentQuote, setCurrentQuote } = useCurrentQuoteStore();

  const getQuoteById = (id: string) => quotes.find((q) => q.id === id);

  const addQuote = async (quote: Omit<TravelQuote, 'id' | 'createdAt'>) => {
    return mutations.addQuote.mutateAsync(quote);
  };

  const updateQuote = async (id: string, updates: Partial<TravelQuote>) => {
    const version = getQuoteById(id)?.version;
    await mutations.updateQuote.mutateAsync({ id, updates, version });
  };

  const deleteQuote = async (id: string) => {
    await mutations.deleteQuote.mutateAsync(id);
  };

  const addItemToQuote = async (quoteId: string, item: Omit<TravelItem, 'id'>) => {
    await mutations.addItemToQuote.mutateAsync({ quoteId, item });
  };

  const updateItemInQuote = async (quoteId: string, itemId: string, updates: Partial<TravelItem>) => {
    await mutations.updateItemInQuote.mutateAsync({ quoteId, itemId, updates });
  };

  const removeItemFromQuote = async (quoteId: string, itemId: string) => {
    await mutations.removeItemFromQuote.mutateAsync({ quoteId, itemId });
  };

  const updateQuoteStatus = async (quoteId: string, status: TravelQuote['status']) => {
    await mutations.updateQuoteStatus.mutateAsync({ id: quoteId, status });
  };

  const duplicateQuote = async (quoteId: string): Promise<string | null> => {
    const original = getQuoteById(quoteId);
    if (!original) return null;

    const { id, createdAt, version, ...quoteData } = original;
    void id;
    void createdAt;
    void version;

    return addQuote({ ...quoteData, title: `${original.title} (Copy)`, status: 'draft' });
  };

  const getCalendarEvents = (
    contactId?: string,
    statusFilters?: TravelQuote['status'][]
  ): CalendarEvent[] => {
    const activeStatusFilters = statusFilters && statusFilters.length > 0
      ? statusFilters
      : (['draft', 'sent', 'accepted', 'rejected'] as TravelQuote['status'][]);

    let filteredQuotes = quotes;
    if (contactId) {
      filteredQuotes = filteredQuotes.filter((q) => q.contactId === contactId);
    }
    filteredQuotes = filteredQuotes.filter((q) => activeStatusFilters.includes(q.status));

    return filteredQuotes.flatMap((quote) =>
      quote.items.map((item) => ({
        id: item.id,
        title: item.name,
        start: new Date(item.startDate),
        end: new Date(item.endDate || item.startDate),
        resource: {
          type: item.type,
          contactId: quote.contactId,
          quoteId: quote.id,
          details: item.details,
        },
      }))
    );
  };

  const getQuotesByStatus = (status: TravelQuote['status']) =>
    quotes.filter((q) => q.status === status);

  const getQuotesStats = (): QuoteStats => {
    const stats = quotes.reduce(
      (acc, quote) => {
        acc.totalQuotes++;
        acc[`${quote.status}Quotes` as keyof typeof acc]++;
        if (quote.status === 'accepted') {
          acc.totalRevenue += quote.totalCost;
        }
        return acc;
      },
      {
        totalQuotes: 0,
        draftQuotes: 0,
        sentQuotes: 0,
        acceptedQuotes: 0,
        rejectedQuotes: 0,
        bookedQuotes: 0,
        cancelledQuotes: 0,
        totalRevenue: 0,
      }
    );

    return {
      ...stats,
      averageQuoteValue: stats.totalQuotes > 0
        ? quotes.reduce((sum, q) => sum + q.totalCost, 0) / stats.totalQuotes
        : 0,
    };
  };

  const generatePreviewLink = async (quoteId: string): Promise<string | null> => {
    const quote = getQuoteById(quoteId);
    if (!quote) return null;
    return fetchClientLink(quoteId, quote.contactId, true);
  };

  const sendQuoteToClient = async (quoteId: string): Promise<boolean> => {
    const quote = getQuoteById(quoteId);
    if (!quote) return false;

    try {
      await updateQuoteStatus(quoteId, 'sent');
      const clientLink = await fetchClientLink(quoteId, quote.contactId, false);
      console.log('Quote sent to client:', { quoteId, clientLink });
      return true;
    } catch (error) {
      console.error('Failed to send quote to client:', error);
      return false;
    }
  };

  // Placeholder retained from the old store — invoice generation from an
  // accepted quote is handled by the finances page, not wired here.
  const generateInvoiceFromAcceptedQuote = (quoteId: string): string | null => {
    const quote = getQuoteById(quoteId);
    if (!quote || quote.status !== 'accepted') return null;
    return crypto.randomUUID();
  };

  return {
    quotes,
    currentQuote,
    setCurrentQuote,
    addQuote,
    updateQuote,
    deleteQuote,
    getQuoteById,
    addItemToQuote,
    updateItemInQuote,
    removeItemFromQuote,
    getCalendarEvents,
    getQuotesByStatus,
    getQuotesStats,
    duplicateQuote,
    updateQuoteStatus,
    generatePreviewLink,
    sendQuoteToClient,
    generateInvoiceFromAcceptedQuote,
  };
}
