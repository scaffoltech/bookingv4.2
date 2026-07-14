import { Contact } from '@/types';
import { useContactsQuery } from '@/hooks/queries/useContactsQuery';
import { useContactMutations } from '@/hooks/mutations/useContactMutations';

// ponytail: drop-in replacement for the old localStorage contact-store,
// backed by Supabase. Mutations are async — callers must await them.
export function useContactCompat() {
  const { data: contacts = [] } = useContactsQuery();
  const mutations = useContactMutations();

  const getContactById = (id: string) => contacts.find((c) => c.id === id);

  const addContact = async (contact: Omit<Contact, 'id' | 'createdAt' | 'quotes'>) => {
    await mutations.addContact.mutateAsync(contact);
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    await mutations.updateContact.mutateAsync({ id, updates });
  };

  const deleteContact = async (id: string) => {
    await mutations.deleteContact.mutateAsync(id);
  };

  const searchContacts = (query: string) => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  };

  // No-op: a quote's contact_id join (useContactsQuery's `quotes(id)` select)
  // already reflects this once the quote is written — nothing to persist here.
  const addQuoteToContact = (_contactId: string, _quoteId: string) => {};

  return {
    contacts,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
    addQuoteToContact,
  };
}
