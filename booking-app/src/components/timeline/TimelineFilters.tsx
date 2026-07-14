'use client';

import { useState } from 'react';
import { useContactStore } from '@/store/contact-store';
import { TravelQuote } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getContactDisplayName } from '@/lib/utils';

interface TimelineFiltersProps {
  selectedContactId: string | null;
  selectedStatuses: TravelQuote['status'][];
  onContactChange: (contactId: string | null) => void;
  onStatusChange: (statuses: TravelQuote['status'][]) => void;
  onClearFilters: () => void;
  itemCount?: number;
}

const QUOTE_STATUSES: Array<{ value: TravelQuote['status']; label: string; color: string }> = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

export function TimelineFilters({
  selectedContactId,
  selectedStatuses,
  onContactChange,
  onStatusChange,
  onClearFilters,
  itemCount,
}: TimelineFiltersProps) {
  const { contacts } = useContactStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const hasActiveFilters = selectedContactId !== null || selectedStatuses.length < 4;

  const handleStatusToggle = (status: TravelQuote['status']) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleSelectAllStatuses = () => {
    if (selectedStatuses.length === 4) {
      onStatusChange([]);
    } else {
      onStatusChange(['draft', 'sent', 'accepted', 'rejected']);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <Badge>
              {[selectedContactId ? 1 : 0, 4 - selectedStatuses.length].filter(n => n > 0).reduce((a, b) => a + b, 0)} active
            </Badge>
          )}
          {itemCount !== undefined && (
            <span className="text-sm text-gray-600">
              • Showing {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear All
            </Button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Client Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Client</Label>
            <Select
              value={selectedContactId || 'all'}
              onValueChange={(value) => onContactChange(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">All Clients</span>
                </SelectItem>
                {contacts
                  .sort((a, b) =>
                    getContactDisplayName(a.firstName, a.lastName)
                      .localeCompare(getContactDisplayName(b.firstName, b.lastName))
                  )
                  .map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getContactDisplayName(contact.firstName, contact.lastName)}
                        </span>
                        <span className="text-xs text-gray-500">{contact.email}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Quote Status</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllStatuses}
                className="text-xs text-blue-600 hover:text-blue-700 h-auto p-1"
              >
                {selectedStatuses.length === 4 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {QUOTE_STATUSES.map((status) => (
                <div
                  key={status.value}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleStatusToggle(status.value)}
                >
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={selectedStatuses.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">Active:</span>
                {selectedContact && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                    <span>{getContactDisplayName(selectedContact.firstName, selectedContact.lastName)}</span>
                    <button
                      onClick={() => onContactChange(null)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedStatuses.length < 4 && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-sm">
                    <span>{selectedStatuses.length} {selectedStatuses.length === 1 ? 'status' : 'statuses'}</span>
                    <button
                      onClick={() => onStatusChange(['draft', 'sent', 'accepted', 'rejected'])}
                      className="hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
