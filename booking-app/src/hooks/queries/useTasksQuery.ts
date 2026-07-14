import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BookingTask } from '@/types/task';

export function useTasksQuery(options?: { skipUserFilter?: boolean }) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['tasks', org?.id, options?.skipUserFilter ? 'admin' : 'user'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // RLS handles org scoping
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((task: any) => ({
        ...task,
        type: task.type,
        quoteId: task.quote_id,
        quoteItemId: task.quote_item_id,
        bookingId: task.booking_id,
        bookingItemId: task.booking_item_id,
        itemType: task.item_type,
        itemName: task.item_name,
        itemDetails: task.item_details,
        customerName: task.customer_name,
        contactId: task.contact_id,
        assignedToName: task.assigned_to_name,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      })) as BookingTask[];
    },
    enabled: !!user,
  });
}

export function useBookingTasksQuery(bookingId?: string | null, quoteId?: string | null, options?: { includeAllStatuses?: boolean }) {
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: ['tasks', 'booking', bookingId, quoteId, options?.includeAllStatuses ? 'all' : 'pending'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!bookingId && !quoteId) return [];

      // RLS handles org scoping
      let query = supabase
        .from('tasks')
        .select('*');

      if (!options?.includeAllStatuses) {
        query = query.eq('status', 'pending');
      }

      if (bookingId && quoteId) {
        query = query.or(`booking_id.eq.${bookingId},quote_id.eq.${quoteId}`);
      } else if (bookingId) {
        query = query.eq('booking_id', bookingId);
      } else if (quoteId) {
        query = query.eq('quote_id', quoteId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((task: any) => ({
        ...task,
        type: task.type,
        quoteId: task.quote_id,
        quoteItemId: task.quote_item_id,
        bookingId: task.booking_id,
        bookingItemId: task.booking_item_id,
        itemType: task.item_type,
        itemName: task.item_name,
        itemDetails: task.item_details,
        customerName: task.customer_name,
        contactId: task.contact_id,
        assignedToName: task.assigned_to_name,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      })) as BookingTask[];
    },
    enabled: !!user && (!!bookingId || !!quoteId),
  });
}
