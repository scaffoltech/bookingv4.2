'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  CheckCircle,
  Plane,
  Hotel,
  MapPin,
  Car,
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  Download,
  Share,
  AlertCircle,
} from 'lucide-react';
import { BookingConfirmation } from '@/types/booking';
import { formatCurrency } from '@/lib/utils';

interface BookingConfirmationProps {
  confirmation: BookingConfirmation;
  onClose?: () => void;
}

export function BookingConfirmationComponent({ 
  confirmation, 
  onClose 
}: BookingConfirmationProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const getStatusVariant = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-5 h-5" />;
      case 'hotel':
        return <Hotel className="w-5 h-5" />;
      case 'activity':
        return <MapPin className="w-5 h-5" />;
      case 'transfer':
        return <Car className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const handleDownloadConfirmation = async () => {
    setIsDownloading(true);
    // Simulate PDF generation delay
    setTimeout(() => {
      // In production, this would generate and download a PDF
      console.log('Downloading confirmation PDF...');
      setIsDownloading(false);
    }, 2000);
  };

  const handleShareConfirmation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking Confirmation - ${confirmation.bookingReference}`,
          text: `Your booking is confirmed! Reference: ${confirmation.bookingReference}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `Booking Confirmed!\nReference: ${confirmation.bookingReference}\nTotal: ${formatCurrency(confirmation.totalAmount)}`
      );
      alert('Booking details copied to clipboard!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Your trip has been successfully booked
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <Badge variant={getStatusVariant(confirmation.status)} className="px-4 py-2 text-sm font-medium">
            {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
          </Badge>
          <Badge
            variant={confirmation.paymentStatus === 'paid' ? 'success' : 'secondary'}
            className="px-4 py-2 text-sm font-medium"
          >
            Payment {confirmation.paymentStatus}
          </Badge>
        </div>
      </div>

      {/* Booking Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">
              Booking Reference
            </h3>
            <p className="text-2xl font-mono font-bold text-blue-800">
              {confirmation.bookingReference}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Keep this reference for your records
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">Booking Date</p>
            <p className="text-lg font-semibold text-blue-900">
              {new Date(confirmation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Booking Details</h2>
        
        {confirmation.items.map((item, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                {getItemIcon(item.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {item.type}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Confirmation Number</p>
                    <p className="font-mono font-semibold">{item.confirmationNumber}</p>
                  </div>
                </div>

                {/* Flight Details */}
                {item.type === 'flight' && 'flightType' in item.details && (
                  <div className="space-y-2">
                    {item.details.outboundFlight && (
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <p className="font-medium">Outbound</p>
                          <p className="text-gray-600">
                            {item.details.outboundFlight.airline} {item.details.outboundFlight.flightNumber}
                          </p>
                        </div>
                        <div>
                          <p>{new Date(item.details.outboundFlight.departureTime).toLocaleString()}</p>
                          <p className="text-gray-600">{item.details.outboundFlight.departureAirportCode}</p>
                        </div>
                        <div>
                          <p>→</p>
                        </div>
                        <div>
                          <p>{new Date(item.details.outboundFlight.arrivalTime).toLocaleString()}</p>
                          <p className="text-gray-600">{item.details.outboundFlight.arrivalAirportCode}</p>
                        </div>
                      </div>
                    )}
                    
                    {item.details.returnFlight && (
                      <div className="flex items-center space-x-4 text-sm pt-2 border-t">
                        <div>
                          <p className="font-medium">Return</p>
                          <p className="text-gray-600">
                            {item.details.returnFlight.airline} {item.details.returnFlight.flightNumber}
                          </p>
                        </div>
                        <div>
                          <p>{new Date(item.details.returnFlight.departureTime).toLocaleString()}</p>
                          <p className="text-gray-600">{item.details.returnFlight.departureAirportCode}</p>
                        </div>
                        <div>
                          <p>→</p>
                        </div>
                        <div>
                          <p>{new Date(item.details.returnFlight.arrivalTime).toLocaleString()}</p>
                          <p className="text-gray-600">{item.details.returnFlight.arrivalAirportCode}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hotel Details */}
                {item.type === 'hotel' && 'hotelName' in item.details && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.details.hotelName}</p>
                        <p className="text-sm text-gray-600">
                          {item.details.location.city}, {item.details.location.country}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{item.details.nights} night{item.details.nights > 1 ? 's' : ''}</p>
                        <p className="text-gray-600">{item.details.roomType}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Check-in: {item.details.checkIn.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{item.details.checkIn.time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Check-out: {item.details.checkOut.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{item.details.checkOut.time}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Details */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Name:</span>
            <span className="font-medium">{confirmation.customerDetails.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Email:</span>
            <span className="font-medium">{confirmation.customerDetails.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Phone:</span>
            <span className="font-medium">{confirmation.customerDetails.phone}</span>
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-900">Total Amount</h3>
            <p className="text-sm text-green-700">Payment Status: {confirmation.paymentStatus}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-800">
              {formatCurrency(confirmation.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Important Information</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights</li>
              <li>• Bring a valid ID/passport for check-in</li>
              <li>• Check baggage allowances and restrictions before travel</li>
              <li>• Review hotel check-in policies and amenities</li>
              <li>• Keep this confirmation accessible during your trip</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button 
          onClick={handleDownloadConfirmation}
          disabled={isDownloading}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? 'Generating PDF...' : 'Download Confirmation'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleShareConfirmation}
          className="flex-1"
        >
          <Share className="w-4 h-4 mr-2" />
          Share Confirmation
        </Button>
        
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}