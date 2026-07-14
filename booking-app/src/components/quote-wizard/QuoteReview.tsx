'use client';

import { useState } from 'react';
import { TravelQuote, Contact } from '@/types';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { Button } from '@/components/ui/button';
import { formatCurrency, getContactDisplayName, formatDate, detectDestinationMismatches, DestinationMismatch } from '@/lib/utils';
import { Plane, Hotel, MapPin, Car, FileText, Send, AlertTriangle, X } from 'lucide-react';

interface QuoteReviewProps {
  quote: TravelQuote;
  contact: Contact;
  onComplete: () => void;
}

export function QuoteReview({ quote, contact, onComplete }: QuoteReviewProps) {
  const { updateQuote, getQuoteById } = useQuoteCompat();
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [detectedMismatches, setDetectedMismatches] = useState<DestinationMismatch[]>([]);

  const currentQuote = getQuoteById(quote.id) || quote;

  const handleSendQuote = () => {
    // Check for destination mismatches before sending
    const mismatches = detectDestinationMismatches(currentQuote.items);

    if (mismatches.length > 0) {
      // Show warning modal
      setDetectedMismatches(mismatches);
      setShowMismatchModal(true);
    } else {
      // No mismatches, proceed with send
      proceedWithSend();
    }
  };

  const proceedWithSend = (overridden = false) => {
    // Record override in quote if applicable
    if (overridden) {
      const validationOverride = {
        timestamp: new Date().toISOString(),
        type: 'destination-mismatch' as const,
        overriddenBy: 'agent' as const,
        mismatches: detectedMismatches,
      };

      updateQuote(quote.id, {
        status: 'sent',
        validationOverrides: [validationOverride]
      });

      console.log('⚠️  Destination mismatch override recorded:', validationOverride);
    } else {
      updateQuote(quote.id, { status: 'sent' });
    }

    setShowMismatchModal(false);
    onComplete();
  };

  const handleSaveDraft = () => {
    updateQuote(quote.id, { status: 'draft' });
    onComplete();
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'hotel': return <Hotel className="w-5 h-5" />;
      case 'activity': return <MapPin className="w-5 h-5" />;
      case 'transfer': return <Car className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review Quote
        </h2>
        <p className="text-gray-600">
          Review the quote details before sending to your client
        </p>
      </div>

      {/* Quote Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{currentQuote.title}</h3>
            <p className="text-gray-600 mt-1">
              For {getContactDisplayName(contact.firstName, contact.lastName)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Travel: {formatDate(currentQuote.travelDates.start)} - {formatDate(currentQuote.travelDates.end)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end space-x-3 text-xs text-gray-600">
              <span>Cost: {formatCurrency(currentQuote.items.reduce((sum, item) => sum + (item.supplierCost || item.price * 0.80), 0))}</span>
              <span className="text-green-600 font-medium">
                +Markup: {formatCurrency(currentQuote.items.reduce((sum, item) => {
                  const supplierCost = item.supplierCost || item.price * 0.80;
                  return sum + (item.price - supplierCost);
                }, 0))}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(currentQuote.totalCost)}
            </div>
            <div className="text-sm text-gray-500">Client Total</div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Client Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Name:</span> {getContactDisplayName(contact.firstName, contact.lastName)}
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span> {contact.email}
          </div>
          {contact.phone && (
            <div>
              <span className="font-medium text-gray-700">Phone:</span> {contact.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700">Total Quotes:</span> {contact.quotes.length}
          </div>
        </div>
      </div>

      {/* Travel Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Travel Items ({currentQuote.items.length})</h4>
        
        {currentQuote.items.length > 0 ? (
          <div className="space-y-4">
            {currentQuote.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600">
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatDate(item.startDate)} {item.endDate && `- ${formatDate(item.endDate)}`}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {item.type} • Quantity: {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>{formatCurrency(item.price)} each</div>
                    {item.supplierCost && (
                      <div className="text-green-600">
                        +{formatCurrency(item.price - item.supplierCost)} markup
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="font-semibold text-lg text-gray-900">Total:</div>
              <div className="font-bold text-xl text-blue-600">
                {formatCurrency(currentQuote.totalCost)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No travel items added yet.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center space-x-4">
        <Button variant="outline" onClick={handleSaveDraft} size="lg">
          <FileText className="w-5 h-5 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={handleSendQuote} size="lg">
          <Send className="w-5 h-5 mr-2" />
          Send Quote to Client
        </Button>
      </div>

      {/* Destination Mismatch Modal */}
      {showMismatchModal && (
        <DestinationMismatchModal
          mismatches={detectedMismatches}
          onCancel={() => setShowMismatchModal(false)}
          onOverride={() => proceedWithSend(true)}
        />
      )}
    </div>
  );
}

// Destination Mismatch Warning Modal
interface DestinationMismatchModalProps {
  mismatches: DestinationMismatch[];
  onCancel: () => void;
  onOverride: () => void;
}

function DestinationMismatchModal({ mismatches, onCancel, onOverride }: DestinationMismatchModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 bg-amber-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Destination Mismatch Detected
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                We noticed potential mismatches between flight destinations and hotel locations.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mismatches List */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-700 font-medium mb-4">
            Please review the following mismatches:
          </p>

          {mismatches.map((mismatch, index) => (
            <div
              key={index}
              className="bg-amber-50 border border-amber-200 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-700">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {mismatch.flightName}
                    </span>
                    <span className="text-sm text-gray-600">→</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {mismatch.flightDestination}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Hotel className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {mismatch.hotelName}
                    </span>
                    <span className="text-sm text-gray-600">in</span>
                    <span className="text-sm font-semibold text-green-600">
                      {mismatch.hotelCity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Warning Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Note:</strong> This may be intentional (e.g., multi-city trip, airport transfers).
              If this is correct, you can override this warning and send the quote.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={onOverride}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Override & Send Anyway
          </Button>
        </div>
      </div>
    </div>
  );
}