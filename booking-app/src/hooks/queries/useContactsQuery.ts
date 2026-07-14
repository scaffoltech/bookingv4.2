import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Contact, Address, TravelPreferences } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';

function dbRowToContact(row: any): Contact {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    phone: row.phone || undefined,
    type: row.type as 'customer' | 'supplier' | undefined,
    address: row.address as Address | undefined,
    preferences: row.preferences as TravelPreferences | undefined,
    company: row.company || undefined,
    notes: row.notes || undefined,
    tags: row.tags || undefined,
    quotes: (row.quotes || []).map((q: { id: string }) => q.id),
    createdAt: new Date(row.created_at),
  };
}

async function fetchContacts(): Promise<Contact[]> {
  const supabase = getSupabaseBrowserClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // RLS handles org scoping — no user_id filter needed
  const { data, error } = await supabase
    .from('contacts')
    .select('*, quotes(id)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(dbRowToContact);
}

export function useContactsQuery() {
  const { user, org } = useAuth();

  return useQuery({
    queryKey: ['contacts', org?.id],
    queryFn: fetchContacts,
    enabled: !!user,
  });
}

export function useContactByIdQuery(
  contactId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<Contact>({
    queryKey: ['contacts', org?.id, contactId],
    queryFn: async () => {
      // Try to get from cache first
      const contacts = queryClient.getQueryData<Contact[]>(['contacts', org?.id]);
      if (contacts) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) return contact;
      }

      if (!contactId) throw new Error('Contact ID is required');

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('contacts')
        .select('*, quotes(id)')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      return dbRowToContact(data);
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!user && !!contactId),
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  });
}
