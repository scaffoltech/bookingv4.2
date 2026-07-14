'use client';

import { useState, useEffect } from 'react';
import { useContactCompat } from '@/hooks/compat/useContactCompat';
import { Contact } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactForm } from '@/components/contacts/ContactForm';
import { getContactDisplayName } from '@/lib/utils';
import { Search, Plus, User } from 'lucide-react';

interface ContactSelectionProps {
  onContactSelect: (contact: Contact) => void;
}

export function ContactSelection({ onContactSelect }: ContactSelectionProps) {
  const { contacts, searchContacts } = useContactCompat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const filteredContacts = searchContacts(searchQuery);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id);
  };

  const handleConfirmSelection = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact) {
      onContactSelect(contact);
    }
  };

  const handleNewContactCreated = () => {
    setShowNewContactForm(false);
    // The newest contact will be at the end of the array
    if (contacts.length > 0) {
      const latestContact = contacts[contacts.length - 1];
      onContactSelect(latestContact);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select a Contact
        </h2>
        <p className="text-gray-600">
          Choose an existing contact or create a new one for this travel quote.
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowNewContactForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Contact</span>
        </Button>
      </div>

      {/* Contact List */}
      {!isHydrated ? (
        <div className="text-center py-12 text-gray-500">
          Loading contacts...
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedContactId === contact.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleContactSelect(contact)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {getContactDisplayName(contact.firstName, contact.lastName)}
                  </div>
                  <div className="text-sm text-gray-500">{contact.email}</div>
                  {contact.phone && (
                    <div className="text-sm text-gray-500">{contact.phone}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {contact.quotes.length} {contact.quotes.length === 1 ? 'quote' : 'quotes'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {searchQuery
            ? 'No contacts found matching your search.'
            : 'No contacts available. Create your first contact to get started.'}
        </div>
      )}

      {/* Confirm Selection */}
      {selectedContactId && (
        <div className="flex justify-center">
          <Button onClick={handleConfirmSelection} size="lg">
            Continue with Selected Contact
          </Button>
        </div>
      )}

      {/* Help text */}
      {filteredContacts.length > 0 && !selectedContactId && (
        <div className="text-center text-gray-500 text-sm">
          Click on a contact above to select them, then continue to the next step.
        </div>
      )}

      {/* New Contact Form Modal */}
      {showNewContactForm && (
        <ContactForm
          onClose={() => setShowNewContactForm(false)}
        />
      )}
    </div>
  );
}