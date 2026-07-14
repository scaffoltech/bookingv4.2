import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { FinancialTransaction } from '@/types/transaction';
import type { Json } from '@/types/database';

export function useTransactionMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const createTransaction = useMutation({
    mutationFn: async (transactionData: Omit<FinancialTransaction, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionData.type,
          status: transactionData.status,
          amount: transactionData.amount,
          currency: transactionData.currency,
          quote_id: transactionData.quoteId,
          invoice_id: transactionData.invoiceId,
          payment_id: transactionData.paymentId,
          commission_id: transactionData.commissionId,
          expense_id: transactionData.expenseId,
          agent_id: transactionData.agentId,
          customer_id: transactionData.customerId,
          description: transactionData.description,
          timestamp: transactionData.timestamp || new Date().toISOString(),
          performed_by: transactionData.performedBy || user.id,
          metadata: transactionData.metadata as unknown as Json,
          related_transactions: transactionData.relatedTransactions,
          previous_state: transactionData.previousState as unknown as Json,
          new_state: transactionData.newState as unknown as Json,
          notes: transactionData.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialTransaction> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    },
  });

  const reverseTransaction = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get original transaction
      const { data: originalTx, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Mark original as reversed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'reversed',
          notes: `Reversed: ${reason}`,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Create reversal transaction
      const { data: reversalTx, error: createError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: originalTx.type,
          status: 'completed',
          amount: -originalTx.amount, // Negative amount for reversal
          currency: originalTx.currency,
          quote_id: originalTx.quote_id,
          invoice_id: originalTx.invoice_id,
          payment_id: originalTx.payment_id,
          commission_id: originalTx.commission_id,
          expense_id: originalTx.expense_id,
          agent_id: originalTx.agent_id,
          customer_id: originalTx.customer_id,
          description: `REVERSAL: ${originalTx.description}`,
          timestamp: new Date().toISOString(),
          performed_by: user.id,
          metadata: {
            ...(originalTx.metadata && typeof originalTx.metadata === 'object' ? originalTx.metadata : {}),
            reversalOf: id,
            reversalReason: reason,
          } as unknown as Json,
          related_transactions: [id],
          notes: reason,
        })
        .select()
        .single();

      if (createError) throw createError;
      return reversalTx.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    },
  });

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    reverseTransaction,
  };
}