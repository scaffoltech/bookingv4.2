import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Booking, BookingItem } from '@/types/booking';

// booking_items rows map 1:1 onto BookingItem except for DB nullability on
// several columns that are always populated by the write paths (orchestrator,
// useBookingMutations). Cast at this single boundary rather than threading
// null-checks through every caller.
function dbRowToBookingItem(item: any): BookingItem {
  return {
    id: item.id,
    bookingId: item.booking_id,
    type: item.type,
    name: item.name,
    startDate: item.start_date,
    endDate: item.end_date,
    price: item.price,
    quantity: item.quantity,
    details: item.details,
    supplier: item.supplier,
    supplierSource: item.supplier_source,
    supplierCost: item.supplier_cost,
    clientPrice: item.client_price,
    platformFee: item.platform_fee,
    agentMarkup: item.agent_markup,
    bookingStatus: item.booking_status,
    confirmationNumber: item.confirmation_number,
    confirmedAt: item.confirmed_at,
    cancellationPolicy: item.cancellation_policy,
    lastCheckedPrice: item.last_checked_price,
    priceCheckRateKey: item.price_check_rate_key,
    orchestrationError: item.orchestration_error,
    retryCount: item.retry_count,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  } as BookingItem;
}

/**
 * Fetch all bookings for the current org with their items and contact details
 */
export function useBookingsQuery(options?: { skipUserFilter?: boolean }) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['bookings', org?.id, options?.skipUserFilter ? 'admin' : 'user'],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // RLS handles org scoping — no user_id filter needed
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          quote_id,
          contact_id,
          booking_reference,
          status,
          orchestration_status,
          total_amount,
          currency,
          payment_status,
          notes,
          created_at,
          updated_at,
          contacts (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }

      if (!bookings || bookings.length === 0) {
        return [];
      }

      // Fetch all booking items for these bookings
      const bookingIds = bookings.map(b => b.id);
      const { data: allItems, error: itemsError } = await supabase
        .from('booking_items')
        .select('*')
        .in('booking_id', bookingIds)
        .order('start_date', { ascending: true });

      if (itemsError) {
        throw new Error(`Failed to fetch booking items: ${itemsError.message}`);
      }

      // Group items by booking_id
      const itemsByBooking = (allItems || []).reduce((acc, item) => {
        if (!acc[item.booking_id]) {
          acc[item.booking_id] = [];
        }
        acc[item.booking_id].push(dbRowToBookingItem(item));
        return acc;
      }, {} as Record<string, BookingItem[]>);

      const bookingsWithItems: Booking[] = bookings.map(booking => ({
        id: booking.id,
        userId: booking.user_id,
        quoteId: booking.quote_id,
        contactId: booking.contact_id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        orchestrationStatus: booking.orchestration_status,
        totalAmount: booking.total_amount,
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        notes: booking.notes,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        items: itemsByBooking[booking.id] || [],
        contact: {
          id: booking.contacts?.id || '',
          name: booking.contacts
            ? `${booking.contacts.first_name} ${booking.contacts.last_name}`.trim()
            : 'Unknown',
          email: booking.contacts?.email || '',
          phone: booking.contacts?.phone || null,
        },
      } as unknown as Booking));

      return bookingsWithItems;
    },
    enabled: !!user?.id,
    refetchInterval: (query) => {
      const bookings = query.state.data;
      if (!bookings) return false;
      const needsPolling = bookings.some(
        (b) => b.orchestrationStatus === 'in_progress' || b.orchestrationStatus === 'pending'
      );
      return needsPolling ? 3000 : false;
    },
  });
}

/**
 * Fetch a single booking by ID with its items
 */
export function useBookingQuery(bookingId: string | null) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!bookingId) throw new Error('Booking ID is required');

      // RLS handles org scoping
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          quote_id,
          contact_id,
          booking_reference,
          status,
          orchestration_status,
          total_amount,
          currency,
          payment_status,
          notes,
          created_at,
          updated_at,
          contacts (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        throw new Error(`Failed to fetch booking: ${bookingError.message}`);
      }

      const { data: items, error: itemsError } = await supabase
        .from('booking_items')
        .select('*')
        .eq('booking_id', bookingId)
        .order('start_date', { ascending: true });

      if (itemsError) {
        throw new Error(`Failed to fetch booking items: ${itemsError.message}`);
      }

      const bookingWithItems = {
        id: booking.id,
        userId: booking.user_id,
        quoteId: booking.quote_id,
        contactId: booking.contact_id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        orchestrationStatus: booking.orchestration_status,
        totalAmount: booking.total_amount,
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        notes: booking.notes,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        items: (items || []).map(dbRowToBookingItem),
        contact: {
          id: booking.contacts?.id || '',
          name: booking.contacts
            ? `${booking.contacts.first_name} ${booking.contacts.last_name}`.trim()
            : 'Unknown',
          email: booking.contacts?.email || '',
          phone: booking.contacts?.phone || null,
        },
      } as unknown as Booking;

      return bookingWithItems;
    },
    enabled: !!user?.id && !!bookingId,
    refetchInterval: (query) => {
      const booking = query.state.data;
      if (!booking) return false;
      const needsPolling = booking.orchestrationStatus === 'in_progress' || booking.orchestrationStatus === 'pending';
      return needsPolling ? 3000 : false;
    },
  });
}
