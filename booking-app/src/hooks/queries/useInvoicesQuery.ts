import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { dbRowToInvoice } from '@/lib/invoice-mapper';

export function useInvoicesQuery(options?: { skipUserFilter?: boolean }) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['invoices', org?.id, options?.skipUserFilter ? 'admin' : 'user'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // RLS handles org scoping
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(dbRowToInvoice);
    },
    enabled: !!user,
  });
}

export function useInvoicesByCustomerQuery(customerId: string | undefined) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['invoices', org?.id, 'customer', customerId],
    queryFn: async () => {
      if (!user || !customerId) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return (data || []).map(dbRowToInvoice);
    },
    enabled: !!user && !!customerId,
  });
}
