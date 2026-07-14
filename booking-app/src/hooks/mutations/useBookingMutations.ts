import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TravelItem } from '@/types';
import type { Json } from '@/types/database';

export function useBookingMutations() {
  const queryClient = useQueryClient();
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const createBookingFromQuote = useMutation({
    mutationFn: async ({
      quoteId,
      contactId,
      items,
      totalAmount,
      status = 'booked'
    }: {
      quoteId: string;
      contactId: string;
      items: TravelItem[];
      totalAmount: number;
      status?: 'pending' | 'booked';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!org?.id) throw new Error('No organization');
      if (!quoteId || !contactId || !items || items.length === 0) {
        throw new Error('Missing required booking data');
      }
      if (!totalAmount || totalAmount <= 0) {
        throw new Error('Invalid booking amount');
      }

      const bookingReference = `BKG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Check if booking already exists for this quote
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle();

      if (existingBooking) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: status,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBooking.id);

        if (updateError) throw new Error(`Failed to update booking: ${updateError.message}`);
        return existingBooking.id;
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          org_id: org.id,
          quote_id: quoteId,
          contact_id: contactId,
          booking_reference: bookingReference,
          status: status,
          total_amount: totalAmount,
          currency: 'USD',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`);

      const bookingItems = items.map((item) => ({
        booking_id: booking.id,
        type: item.type,
        name: item.name,
        start_date: item.startDate,
        end_date: item.endDate || item.startDate,
        price: item.price,
        quantity: item.quantity || 1,
        details: (item.details || {}) as Json,
        supplier: item.supplier,
        supplier_source: item.supplierSource,
        supplier_cost: item.supplierCost,
        client_price: item.clientPrice || item.price,
        platform_fee: item.platformFee,
        agent_markup: item.agentMarkup,
        booking_status: 'booked',
        confirmation_number: item.confirmationNumber,
        cancellation_policy: item.cancellationPolicy as Json | undefined,
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) {
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error(`Failed to create booking items: ${itemsError.message}`);
      }

      return booking.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', org?.id] });
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({
      bookingId,
      status,
      notes
    }: {
      bookingId: string;
      status: 'pending' | 'confirmed' | 'booked' | 'cancelled' | 'completed';
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (notes) updateData.notes = notes;

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', org?.id] });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({
      bookingId,
      paymentStatus
    }: {
      bookingId: string;
      paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', org?.id] });
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async ({
      bookingId,
      reason
    }: {
      bookingId: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      const { error: itemsError } = await supabase
        .from('booking_items')
        .update({
          booking_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId);

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', org?.id] });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', org?.id] });
    },
  });

  return {
    createBookingFromQuote,
    updateBookingStatus,
    updatePaymentStatus,
    cancelBooking,
    deleteBooking,
  };
}
