import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Contact, Address, TravelPreferences } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';

type ContactInsert = {
  user_id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  type: 'customer' | 'supplier';
  company: string | null;
  notes: string | null;
  tags: string[] | null;
  address: any | null;
  preferences: any | null;
};

function contactToDbInsert(contact: Omit<Contact, 'id' | 'createdAt' | 'quotes'>, userId: string, orgId: string): ContactInsert {
  return {
    user_id: userId,
    org_id: orgId,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone || null,
    type: contact.type || 'customer',
    company: contact.company || null,
    notes: contact.notes || null,
    tags: contact.tags || null,
    address: contact.address as any || null,
    preferences: contact.preferences as any || null,
  };
}

export function useContactMutations() {
  const { user, org } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const addContact = useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'createdAt' | 'quotes'>) => {
      if (!user) throw new Error('Not authenticated');
      if (!org) throw new Error('No organization');

      const dbContact = contactToDbInsert(contact, user.id, org.id);
      const { data, error } = await supabase
        .from('contacts')
        .insert(dbContact)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', org?.id] });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const dbUpdate: any = {};

      if (updates.firstName !== undefined) dbUpdate.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdate.last_name = updates.lastName;
      if (updates.email !== undefined) dbUpdate.email = updates.email;
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone || null;
      if (updates.type !== undefined) dbUpdate.type = updates.type;
      if (updates.company !== undefined) dbUpdate.company = updates.company || null;
      if (updates.notes !== undefined) dbUpdate.notes = updates.notes || null;
      if (updates.tags !== undefined) dbUpdate.tags = updates.tags || null;
      if (updates.address !== undefined) dbUpdate.address = updates.address || null;
      if (updates.preferences !== undefined) dbUpdate.preferences = updates.preferences || null;

      const { error } = await supabase
        .from('contacts')
        .update(dbUpdate)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', org?.id] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', org?.id] });
    },
  });

  return {
    addContact,
    updateContact,
    deleteContact,
  };
}
