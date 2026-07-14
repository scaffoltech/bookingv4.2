import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Commission } from '@/types/financial';

export function useCommissionMutations() {
  const queryClient = useQueryClient();
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const createCommission = useMutation({
    mutationFn: async (commissionData: Omit<Commission, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!org?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('commissions')
        .insert({
          user_id: user.id,
          org_id: org.id,
          agent_id: commissionData.agentId,
          agent_name: commissionData.agentName,
          booking_id: commissionData.bookingId,
          quote_id: commissionData.quoteId,
          invoice_id: commissionData.invoiceId,
          customer_id: commissionData.customerId,
          customer_name: commissionData.customerName,
          booking_amount: commissionData.bookingAmount,
          commission_rate: commissionData.commissionRate,
          commission_amount: commissionData.commissionAmount,
          currency: commissionData.currency || 'USD',
          status: commissionData.status || 'pending',
          payment_method: commissionData.paymentMethod,
          paid_at: commissionData.paidAt,
          transaction_id: commissionData.transactionId,
          notes: commissionData.notes,
          booking_type: commissionData.bookingType,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Commission> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.paidAt !== undefined) updateData.paid_at = updates.paidAt;
      if (updates.transactionId !== undefined) updateData.transaction_id = updates.transactionId;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.commissionRate !== undefined) updateData.commission_rate = updates.commissionRate;
      if (updates.commissionAmount !== undefined) updateData.commission_amount = updates.commissionAmount;

      const { error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const deleteCommission = useMutation({
    mutationFn: async (commissionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .delete()
        .eq('id', commissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
      transactionId
    }: {
      id: string;
      paymentMethod: string;
      transactionId?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          transaction_id: transactionId || `TXN-${Date.now()}`,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const approve = useMutation({
    mutationFn: async (commissionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const bulkMarkAsPaid = useMutation({
    mutationFn: async ({
      ids,
      paymentMethod
    }: {
      ids: string[];
      paymentMethod: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          transaction_id: `BULK-TXN-${Date.now()}`,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const generateCommissionFromBooking = useMutation({
    mutationFn: async ({
      agentId,
      agentName,
      bookingId,
      quoteId,
      invoiceId,
      customerId,
      customerName,
      bookingAmount,
      bookingType,
      quoteCommissionRate,
    }: {
      agentId: string;
      agentName: string;
      bookingId: string;
      quoteId?: string;
      invoiceId?: string;
      customerId: string;
      customerName: string;
      bookingAmount: number;
      bookingType?: string;
      quoteCommissionRate?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!org?.id) throw new Error('No organization');

      // Dedup: check if commission already exists for this quote
      if (quoteId) {
        const { data: existingCommission } = await supabase
          .from('commissions')
          .select('id')
          .eq('quote_id', quoteId)
          .maybeSingle();

        if (existingCommission) {
          console.log('[useCommissionMutations] Commission already exists for quote, returning existing:', existingCommission.id);
          return existingCommission.id;
        }
      }

      // Validate booking amount
      if (!bookingAmount || typeof bookingAmount !== 'number' || isNaN(bookingAmount) || bookingAmount <= 0) {
        throw new Error(`Invalid booking amount: ${bookingAmount}. Must be a positive number.`);
      }

      // Calculate commission rate based on booking type if not provided
      const defaultRates: Record<string, number> = {
        hotel: 10,
        flight: 5,
        activity: 12,
        transfer: 8,
      };

      const commissionRate = quoteCommissionRate || defaultRates[bookingType || 'hotel'] || 10;

      // Validate commission rate
      if (!commissionRate || isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        throw new Error(`Invalid commission rate: ${commissionRate}. Must be between 0 and 100.`);
      }

      const commissionAmount = (bookingAmount * commissionRate) / 100;

      // Final safety check - ensure commission amount is valid
      if (isNaN(commissionAmount) || commissionAmount < 0) {
        throw new Error(`Calculated commission amount is invalid: ${commissionAmount}`);
      }

      const { data, error } = await supabase
        .from('commissions')
        .insert({
          user_id: user.id,
          org_id: org.id,
          agent_id: agentId,
          agent_name: agentName,
          booking_id: bookingId,
          quote_id: quoteId,
          invoice_id: invoiceId,
          customer_id: customerId,
          customer_name: customerName,
          booking_amount: bookingAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          currency: 'USD',
          status: 'pending',
          booking_type: bookingType || 'hotel',
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const reviewDraft = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates?: { commissionRate?: number; commissionAmount?: number; bookingAmount?: number } }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {
        status: 'pending',
        updated_at: new Date().toISOString(),
      };
      if (updates?.commissionRate !== undefined) {
        updateData.commission_rate = updates.commissionRate;
        // Recalculate amount if rate changed and booking amount provided
        if (updates?.bookingAmount !== undefined) {
          updateData.commission_amount = (updates.bookingAmount * updates.commissionRate) / 100;
        }
      }
      if (updates?.commissionAmount !== undefined) {
        updateData.commission_amount = updates.commissionAmount;
      }

      const { error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', id)
        .eq('status', 'draft');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  const bulkReviewDrafts = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .eq('status', 'draft');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', org?.id] });
    },
  });

  return {
    createCommission,
    updateCommission,
    deleteCommission,
    approve,
    bulkApprove,
    markAsPaid,
    bulkMarkAsPaid,
    generateCommissionFromBooking,
    reviewDraft,
    bulkReviewDrafts,
  };
}
