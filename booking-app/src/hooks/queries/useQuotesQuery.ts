import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TravelItem, TravelQuote } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { dbRowToQuote } from '@/lib/quote-mapper';

async function fetchQuotes(): Promise<TravelQuote[]> {
  const supabase = getSupabaseBrowserClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // RLS handles org scoping — no user_id filter needed
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      contact:contact_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(dbRowToQuote);
}

export function useQuotesQuery(options?: { skipUserFilter?: boolean }) {
  const { user, org } = useAuth();

  return useQuery({
    queryKey: ['quotes', org?.id, options?.skipUserFilter ? 'admin' : 'user'],
    queryFn: fetchQuotes,
    enabled: !!user,
  });
}

export function useQuoteByIdQuery(
  quoteId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<TravelQuote>({
    queryKey: ['quotes', org?.id, quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error('Quote ID is required');

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          contact:contact_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      return dbRowToQuote(data);
    },
    initialData: () => {
      const quotes = queryClient.getQueryData<TravelQuote[]>(['quotes', org?.id]);
      if (!quotes) return undefined;
      const match = quotes.find(q => q.id === quoteId);
      return match ? { ...match } : undefined;
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!user && !!quoteId),
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  });
}

export function useQuotesByContactQuery(contactId: string | undefined) {
  const { user, org } = useAuth();

  return useQuery({
    queryKey: ['quotes', org?.id, 'contact', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(dbRowToQuote);
    },
    enabled: !!user && !!contactId,
  });
}
