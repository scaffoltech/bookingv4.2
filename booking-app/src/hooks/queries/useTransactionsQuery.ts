import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { FinancialTransaction } from '@/types/transaction';

export function useTransactionsQuery() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase
      return (data || []).map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        quoteId: transaction.quote_id,
        invoiceId: transaction.invoice_id,
        paymentId: transaction.payment_id,
        commissionId: transaction.commission_id,
        expenseId: transaction.expense_id,
        agentId: transaction.agent_id,
        customerId: transaction.customer_id,
        description: transaction.description,
        timestamp: transaction.timestamp,
        performedBy: transaction.performed_by,
        metadata: transaction.metadata,
        relatedTransactions: transaction.related_transactions,
        previousState: transaction.previous_state,
        newState: transaction.new_state,
        notes: transaction.notes,
      } as FinancialTransaction));
    },
    enabled: !!user?.id,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}