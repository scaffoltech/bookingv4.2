import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuoteMutations } from '@/hooks/mutations/useQuoteMutations';
import { TravelQuote } from '@/types';
import { toast } from 'sonner';

export function useOptimisticQuote(quoteId?: string) {
  const queryClient = useQueryClient();
  const { updateQuote: baseUpdateQuote } = useQuoteMutations();

  const updateQuote = useMutation({
    mutationFn: async (updates: Partial<TravelQuote>) => {
      if (!quoteId) throw new Error('No quote ID provided');
      await baseUpdateQuote.mutateAsync({ id: quoteId, updates });
    },

    // OPTIMISTIC UPDATE - Update UI immediately
    onMutate: async (newQuote) => {
      if (!quoteId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['quote', quoteId] });

      // Snapshot current value for rollback
      const previousQuote = queryClient.getQueryData(['quote', quoteId]);

      // Optimistically update cache
      queryClient.setQueryData(['quote', quoteId], (old: TravelQuote | undefined) => {
        if (!old) return old;
        return { ...old, ...newQuote };
      });

      // Return context for rollback
      return { previousQuote };
    },

    // ROLLBACK on error
    onError: (err, newQuote, context) => {
      if (!quoteId || !context?.previousQuote) return;

      // Restore previous value
      queryClient.setQueryData(['quote', quoteId], context.previousQuote);

      toast.error('Failed to save changes. Please try again.', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    },

    // SUCCESS feedback
    onSuccess: () => {
      toast.success('Changes saved successfully');
    },

    // Always refetch to ensure consistency
    onSettled: () => {
      if (!quoteId) return;
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
    },
  });

  return { updateQuote };
}
