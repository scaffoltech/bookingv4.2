'use client';

import { useState } from 'react';
import { TravelQuote, TravelItem, Contact } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { 
  Calendar, 
  MapPin, 
  Plane, 
  Hotel, 
  Car, 
  Clock,
  DollarSign,
  MessageSquare,
  CreditCard,
  Check,
  X,
  FileText,
  User,
  Mail,
  Download,
  CalendarPlus,
} from 'lucide-react';
import moment from 'moment';
import { ClientMessageModal } from './ClientMessageModal';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { downloadICSFile, generateGoogleCalendarLink } from '@/lib/calendar-export';

interface ClientQuoteViewProps {
  quote: TravelQuote;
  contact: Contact;
  agentName?: string;
  agentEmail?: string;
  onQuoteAction?: (action: 'accept' | 'reject' | 'message' | 'payment') => void;
  clientToken?: string;
}

interface PaymentConfirmationData {
  paymentId: string;
  paymentStatus: 'unpaid' | 'deposit_paid' | 'partially_paid' | 'paid_in_full';
  totalPaid: number;
  remainingBalance: number;
  receiptUrl?: string;
}

export function ClientQuoteView({
  quote,
  contact,
  agentName = 'Your Travel Agent',
  agentEmail,
  onQuoteAction
}: ClientQuoteViewProps) {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // 'confirmed' is a local UI-only sentinel (post-payment), not a DB status value.
  const [quoteStatus, setQuoteStatus] = useState<TravelQuote['status'] | 'confirmed'>(quote.status);
  const [paymentInfo, setPaymentInfo] = useState<PaymentConfirmationData | null>(null);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5 text-blue-600" />;
      case 'hotel': return <Hotel className="w-5 h-5 text-green-600" />;
      case 'activity': return <MapPin className="w-5 h-5 text-purple-600" />;
      case 'transfer': return <Car className="w-5 h-5 text-orange-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-blue-50 border-blue-200';
      case 'hotel': return 'bg-green-50 border-green-200';
      case 'activity': return 'bg-purple-50 border-purple-200';
      case 'transfer': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatItemDetails = (item: TravelItem) => {
    const details = [];
    
    if (item.startDate) {
      const startDate = moment(item.startDate);
      const endDate = item.endDate ? moment(item.endDate) : null;
      
      if (endDate && !startDate.isSame(endDate, 'day')) {
        details.push(`${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`);
      } else {
        details.push(startDate.format('MMM D, YYYY [at] h:mm A'));
      }
    }

    // Add specific details based on type
    if (item.details) {
      const itemDetails = item.details as Record<string, unknown>;
      switch (item.type) {
        case 'flight':
          if (itemDetails.departure_airport && itemDetails.arrival_airport) {
            details.push(`${itemDetails.departure_airport} → ${itemDetails.arrival_airport}`);
          }
          if (itemDetails.flight_number) {
            details.push(`Flight ${itemDetails.flight_number}`);
          }
          break;
        case 'hotel':
          if (itemDetails.location) {
            const location = itemDetails.location as unknown;
            if (typeof location === 'string') {
              details.push(location);
            } else if (location && typeof location === 'object' && 'city' in location && 'country' in location) {
              const loc = location as { city: string; country: string };
              details.push(`${loc.city}, ${loc.country}`);
            }
          }
          if (itemDetails.room_type) {
            details.push(itemDetails.room_type);
          }
          if (itemDetails.nights) {
            details.push(`${itemDetails.nights} night${itemDetails.nights > 1 ? 's' : ''}`);
          }
          break;
        case 'activity':
          if (itemDetails.location) {
            const location = itemDetails.location as unknown;
            if (typeof location === 'string') {
              details.push(location);
            } else if (location && typeof location === 'object' && 'city' in location && 'country' in location) {
              const loc = location as { city: string; country: string };
              details.push(`${loc.city}, ${loc.country}`);
            }
          }
          if (itemDetails.duration) {
            details.push(`${itemDetails.duration} hours`);
          }
          break;
        case 'transfer':
          if (itemDetails.from && itemDetails.to) {
            details.push(`${itemDetails.from} → ${itemDetails.to}`);
          }
          break;
      }
    }

    return details;
  };

  const handleAcceptQuote = () => {
    setQuoteStatus('accepted');
    onQuoteAction?.('accept');
  };

  const handleRejectQuote = () => {
    setQuoteStatus('rejected');
    onQuoteAction?.('reject');
  };

  const handleSendMessage = (message: string, requestChanges: boolean) => {
    onQuoteAction?.('message');
    // Here you would typically send the message to the backend
    console.log('Message sent:', { message, requestChanges, quoteId: quote.id });
  };

  const handlePaymentSuccess = (paymentData?: PaymentConfirmationData) => {
    console.log('✅ Payment successful for quote:', quote.id, paymentData);

    if (paymentData) {
      setPaymentInfo(paymentData);
      // Update quote status based on payment status
      if (paymentData.paymentStatus === 'paid_in_full') {
        setQuoteStatus('confirmed');
      } else if (paymentData.paymentStatus === 'deposit_paid') {
        setQuoteStatus('accepted');
      }
    } else {
      setQuoteStatus('accepted');
    }

    onQuoteAction?.('payment');
    setShowPaymentModal(false);
  };

  const handleDownloadCalendar = () => {
    downloadICSFile(quote);
  };

  const handleAddToGoogleCalendar = (item: TravelItem) => {
    const url = generateGoogleCalendarLink(item, quote);
    window.open(url, '_blank');
  };

  const groupedItems = quote.items.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, TravelItem[]>);

  const isQuoteFinal = quoteStatus === 'accepted' || quoteStatus === 'rejected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="glass-white border-glass shadow-soft">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Your Travel Quote
              </h1>
              <h2 className="text-xl text-gray-700 mb-1">
                {quote.title}
              </h2>
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {moment(quote.travelDates.start).format('MMM D')} - {moment(quote.travelDates.end).format('MMM D, YYYY')}
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Prepared by {agentName}
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex flex-col items-end space-y-2">
                <Badge
                  variant={
                    quoteStatus === 'sent' ? 'default' :
                    quoteStatus === 'confirmed' || quoteStatus === 'accepted' ? 'success' :
                    quoteStatus === 'rejected' ? 'destructive' :
                    'secondary'
                  }
                >
                  {quoteStatus === 'sent' ? 'Pending Response' :
                   quoteStatus === 'confirmed' ? 'Confirmed' :
                   quoteStatus === 'accepted' ? 'Accepted' :
                   quoteStatus === 'rejected' ? 'Rejected' :
                   quoteStatus.charAt(0).toUpperCase() + quoteStatus.slice(1)}
                </Badge>

                {paymentInfo && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    {paymentInfo.paymentStatus === 'paid_in_full' ? '💰 Paid in Full' :
                     paymentInfo.paymentStatus === 'deposit_paid' ? '💳 Deposit Paid' :
                     '💵 Payment Received'}
                  </Badge>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(quote.totalCost)}
                </div>
                {paymentInfo && paymentInfo.remainingBalance > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Balance Due: {formatCurrency(paymentInfo.remainingBalance)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Trip Overview */}
        <div className="glass-card rounded-2xl shadow-medium border-glass mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Duration</div>
              <div className="text-sm text-gray-600">
                {moment(quote.travelDates.end).diff(moment(quote.travelDates.start), 'days') + 1} days
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Items Included</div>
              <div className="text-sm text-gray-600">
                {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Total Value</div>
              <div className="text-sm text-gray-600">
                {formatCurrency(quote.totalCost)}
              </div>
            </div>
          </div>
        </div>

        {/* Travel Items by Category */}
        {Object.entries(groupedItems).map(([type, items]) => (
          <div key={type} className="glass-card rounded-2xl shadow-medium border-glass mb-6">
            <div className="px-6 py-4 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center space-x-2">
                {getItemIcon(type)}
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {type}s ({items.length})
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`border rounded-lg p-4 ${getItemTypeColor(item.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {formatItemDetails(item).map((detail, index) => (
                            <div key={index} className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                              {detail}
                            </div>
                          ))}
                        </div>
                        {item.quantity > 1 && (
                          <div className="mt-2 text-sm text-gray-600">
                            Quantity: {item.quantity}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="text-sm text-gray-600">
                            {formatCurrency(item.price)} each
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddToGoogleCalendar(item)}
                          className="text-xs"
                        >
                          <CalendarPlus className="w-3 h-3 mr-1" />
                          Add to Calendar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quote Summary */}
        <div className="glass-card rounded-2xl shadow-medium border-glass mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h3>
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([type, items]) => {
              const typeTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              return (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">
                    {type}s ({items.length} item{items.length !== 1 ? 's' : ''})
                  </span>
                  <span className="font-medium">{formatCurrency(typeTotal)}</span>
                </div>
              );
            })}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(quote.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Export */}
        <div className="glass-card rounded-2xl shadow-medium border-glass p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add to Your Calendar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleDownloadCalendar}
              variant="outline"
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Download className="w-5 h-5" />
              <span>Download Calendar (.ics)</span>
            </Button>
            
            <Button 
              onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(quote.title)}&dates=${moment(quote.travelDates.start).format('YYYYMMDD')}/${moment(quote.travelDates.end).format('YYYYMMDD')}&details=${encodeURIComponent(`Travel itinerary for ${quote.title}. Total cost: ${formatCurrency(quote.totalCost)}`)}`, '_blank')}
              variant="outline"
              className="flex items-center justify-center space-x-2 h-12 text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <CalendarPlus className="w-5 h-5" />
              <span>Add Trip to Google Calendar</span>
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {!isQuoteFinal && quoteStatus === 'sent' && (
          <div className="glass-card rounded-2xl shadow-medium border-glass p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you like to do?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={handleAcceptQuote}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white h-12"
              >
                <Check className="w-5 h-5" />
                <span>Accept Quote</span>
              </Button>
              
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white h-12"
              >
                <CreditCard className="w-5 h-5" />
                <span>Accept & Pay</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setShowMessageModal(true)}
                className="flex items-center justify-center space-x-2 h-12"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Request Changes</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleRejectQuote}
                className="flex items-center justify-center space-x-2 text-red-600 border-red-300 hover:bg-red-50 h-12"
              >
                <X className="w-5 h-5" />
                <span>Decline Quote</span>
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {isQuoteFinal && (
          <div className="glass-card rounded-2xl shadow-medium border-glass p-6">
            <div className={`flex items-center space-x-3 ${
              quoteStatus === 'accepted' || quoteStatus === 'confirmed' ? 'text-green-600' : 'text-red-600'
            }`}>
              {quoteStatus === 'accepted' || quoteStatus === 'confirmed' ? (
                <Check className="w-6 h-6" />
              ) : (
                <X className="w-6 h-6" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  Quote {quoteStatus === 'accepted' || quoteStatus === 'confirmed' ? 'Accepted' : 'Declined'}
                </h3>
                <p className="text-sm text-gray-600">
                  {quoteStatus === 'accepted' || quoteStatus === 'confirmed'
                    ? 'Thank you for accepting this quote. Your travel agent will be in touch shortly with next steps.'
                    : 'You have declined this quote. Feel free to reach out if you\'d like to discuss alternatives.'
                  }
                </p>
              </div>
            </div>

            {/* Payment Status Display */}
            {paymentInfo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-1">
                      {paymentInfo.paymentStatus === 'paid_in_full' ? 'Payment Complete!' : 'Deposit Received!'}
                    </h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>
                        {paymentInfo.paymentStatus === 'paid_in_full'
                          ? `Your payment of ${formatCurrency(paymentInfo.totalPaid)} has been received and processed.`
                          : `Your deposit of ${formatCurrency(paymentInfo.totalPaid)} has been received.`
                        }
                      </p>
                      {paymentInfo.remainingBalance > 0 && (
                        <p className="font-medium">
                          Remaining balance: {formatCurrency(paymentInfo.remainingBalance)}
                        </p>
                      )}
                      {paymentInfo.receiptUrl && (
                        <a
                          href={paymentInfo.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 hover:text-green-700 underline mt-2"
                        >
                          View Receipt →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(quoteStatus === 'accepted' || quoteStatus === 'confirmed') && !paymentInfo && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment
                </Button>
              </div>
            )}

            {/* Show remaining balance payment option if deposit was paid */}
            {paymentInfo && paymentInfo.paymentStatus === 'deposit_paid' && paymentInfo.remainingBalance > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay Remaining Balance ({formatCurrency(paymentInfo.remainingBalance)})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div className="glass-card rounded-2xl shadow-medium border-glass p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Travel Agent</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {agentName}
                </div>
                {agentEmail && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <a href={`mailto:${agentEmail}`} className="text-blue-600 hover:underline">
                      {agentEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Have Questions?</h4>
              <Button 
                variant="outline"
                onClick={() => setShowMessageModal(true)}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      <ClientMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSend={handleSendMessage}
        agentName={agentName}
      />

      {/* Payment Modal - Real Stripe Integration */}
      <PaymentModal
        quote={quote}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}