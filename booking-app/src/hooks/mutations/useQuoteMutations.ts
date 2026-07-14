import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TravelQuote, TravelItem } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { calculateQuoteTotal } from '@/lib/utils';
import type { Json } from '@/types/database';

export class StaleVersionError extends Error {
  constructor(quoteId: string) {
    super(`Quote ${quoteId} was modified by another session. Please refresh and try again.`);
    this.name = 'StaleVersionError';
  }
}

export function useQuoteMutations() {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const addQuote = useMutation({
    mutationFn: async (quote: Omit<TravelQuote, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('Not authenticated');
      if (!org) throw new Error('No organization');

      const insertPayload = {
        user_id: user.id,
        org_id: org.id,
        contact_id: quote.contactId,
        quote_number: `Q-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: quote.title,
        status: quote.status,
        total_amount: quote.totalCost,
        currency: 'USD',
        items: (quote.items || []) as unknown as Json,
        travel_start_date: quote.travelDates.start.toISOString(),
        travel_end_date: quote.travelDates.end.toISOString(),
        notes: null,
        version: 1,
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, updates, version }: { id: string; updates: Partial<TravelQuote>; version?: number }) => {
      const dbUpdate: any = {};

      if (updates.contactId !== undefined) dbUpdate.contact_id = updates.contactId;
      if (updates.title !== undefined) dbUpdate.title = updates.title;
      if (updates.status !== undefined) dbUpdate.status = updates.status;
      if (updates.totalCost !== undefined) dbUpdate.total_amount = updates.totalCost;
      if (updates.items !== undefined) dbUpdate.items = updates.items;
      if (updates.travelDates !== undefined) {
        dbUpdate.travel_start_date = updates.travelDates.start.toISOString();
        dbUpdate.travel_end_date = updates.travelDates.end.toISOString();
      }
      if (updates.paymentStatus !== undefined) dbUpdate.payment_status = updates.paymentStatus;
      if (updates.totalPaid !== undefined) dbUpdate.total_paid = updates.totalPaid;
      if (updates.remainingBalance !== undefined) dbUpdate.remaining_balance = updates.remainingBalance;

      if (version != null) {
        dbUpdate.version = version + 1;

        const { data, error } = await supabase
          .from('quotes')
          .update(dbUpdate)
          .eq('id', id)
          .eq('version', version)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new StaleVersionError(id);
      } else {
        const { error } = await supabase
          .from('quotes')
          .update(dbUpdate)
          .eq('id', id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TravelQuote['status'] }) => {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const addItemToQuote = useMutation({
    mutationFn: async ({ quoteId, item }: { quoteId: string; item: Omit<TravelItem, 'id'> }) => {
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('items, version')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      const currentVersion = quote.version as number;
      const items = (quote.items as unknown as TravelItem[]) || [];
      const newItem = { ...item, id: crypto.randomUUID() };
      const updatedItems = [...items, newItem];
      const totalAmount = calculateQuoteTotal(updatedItems);

      const { data, error } = await supabase
        .from('quotes')
        .update({
          items: updatedItems as unknown as Json,
          total_amount: totalAmount,
          version: currentVersion + 1,
        })
        .eq('id', quoteId)
        .eq('version', currentVersion)
        .select('items, total_amount, version')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new StaleVersionError(quoteId);

      const savedItems = data.items as unknown as TravelItem[] | null;
      if (!savedItems || savedItems.length !== updatedItems.length) {
        throw new Error(`Database verification failed: Expected ${updatedItems.length} items, got ${savedItems?.length || 0}`);
      }

      return newItem.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const updateItemInQuote = useMutation({
    mutationFn: async ({ quoteId, itemId, updates }: { quoteId: string; itemId: string; updates: Partial<TravelItem> }) => {
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('items, version')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      const currentVersion = quote.version as number;
      const items = (quote.items as unknown as TravelItem[]) || [];
      const updatedItems = items.map((item: TravelItem) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      const totalAmount = calculateQuoteTotal(updatedItems);

      const { data, error } = await supabase
        .from('quotes')
        .update({
          items: updatedItems as unknown as Json,
          total_amount: totalAmount,
          version: currentVersion + 1,
        })
        .eq('id', quoteId)
        .eq('version', currentVersion)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new StaleVersionError(quoteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const removeItemFromQuote = useMutation({
    mutationFn: async ({ quoteId, itemId }: { quoteId: string; itemId: string }) => {
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('items, version')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      const currentVersion = quote.version as number;
      const items = (quote.items as unknown as TravelItem[]) || [];
      const updatedItems = items.filter((item: TravelItem) => item.id !== itemId);
      const totalAmount = calculateQuoteTotal(updatedItems);

      const { data, error } = await supabase
        .from('quotes')
        .update({
          items: updatedItems as unknown as Json,
          total_amount: totalAmount,
          version: currentVersion + 1,
        })
        .eq('id', quoteId)
        .eq('version', currentVersion)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new StaleVersionError(quoteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  return {
    addQuote,
    updateQuote,
    deleteQuote,
    updateQuoteStatus,
    addItemToQuote,
    updateItemInQuote,
    removeItemFromQuote,
  };
}
