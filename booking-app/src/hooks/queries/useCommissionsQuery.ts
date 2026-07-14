import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Commission } from '@/types/financial';

export function useCommissionsQuery(options?: { skipUserFilter?: boolean }) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['commissions', org?.id, options?.skipUserFilter ? 'admin' : 'user'],
    queryFn: async () => {
      if (!user?.id) return [];

      // RLS handles org scoping
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((commission: any) => ({
        id: commission.id,
        agentId: commission.agent_id,
        agentName: commission.agent_name,
        bookingId: commission.booking_id,
        quoteId: commission.quote_id,
        invoiceId: commission.invoice_id,
        customerId: commission.customer_id,
        customerName: commission.customer_name,
        bookingAmount: commission.booking_amount,
        commissionRate: commission.commission_rate,
        commissionAmount: commission.commission_amount,
        currency: commission.currency,
        status: commission.status,
        paymentMethod: commission.payment_method,
        paidAt: commission.paid_at,
        transactionId: commission.transaction_id,
        notes: commission.notes,
        bookingType: commission.booking_type,
        createdAt: commission.created_at,
        updatedAt: commission.updated_at,
      } as Commission));
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}
