export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Full name (computed from firstName + lastName)
  email: string;
  phone?: string;
  type?: 'customer' | 'supplier'; // Contact type
  company?: string; // Company name
  tags?: string[]; // Tags for categorization and search
  notes?: string;
  address?: Address;
  preferences?: TravelPreferences;
  quotes: string[]; // Quote IDs
  createdAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface TravelPreferences {
  preferredAirlines?: string[];
  seatPreference?: 'aisle' | 'window' | 'middle';
  hotelPreference?: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface ValidationOverride {
  timestamp: string;
  type: 'destination-mismatch';
  overriddenBy: 'agent';
  mismatches?: Array<{
    flightName: string;
    flightDestination: string;
    hotelName: string;
    hotelCity: string;
  }>;
}

export interface TravelQuote {
  id: string;
  contactId: string;
  customerId: string; // Alias for contactId
  customerName: string; // Contact's full name
  title: string;
  items: TravelItem[];
  totalCost: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'booked' | 'cancelled';
  travelDates: { start: Date; end: Date };
  commissionRate?: number; // percentage (0-50), defaults to global setting
  validationOverrides?: ValidationOverride[]; // Track validation warnings that were overridden
  createdAt: Date;

  // Payment tracking
  paymentStatus?: 'unpaid' | 'deposit_paid' | 'partially_paid' | 'paid_in_full' | 'refunded';
  totalPaid?: number;
  remainingBalance?: number;

  // Quote validity
  generatedAt?: Date;
  validUntil?: Date;
  lastRepricedAt?: Date;

  // Pricing history
  originalTotalCost?: number; // Initial quote price
  currentTotalCost?: number; // After repricing
  priceChanges?: string[]; // PriceChange IDs

  // Optimistic locking
  version?: number;
}

export interface TravelItem {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'transfer';
  name: string;
  startDate: string;
  endDate?: string;
  price: number;
  quantity: number;
  details: Record<string, unknown>;
  source?: 'api' | 'manual'; // Track if item came from API (HotelBeds, flights) or manual entry
  apiProvider?: 'hotelbeds' | 'amadeus' | 'sabre'; // Which API provider if applicable

  // Supplier tracking
  supplier?: string; // Supplier/vendor name (e.g., "Marriott", "HotelBeds", "Viator")
  supplierSource?: 'api_hotelbeds' | 'api_amadeus' | 'api_sabre' | 'offline_platform' | 'offline_agent';
  supplierCost?: number; // Nett cost we pay supplier
  clientPrice?: number; // What client pays (renamed from price for clarity)
  platformFee?: number; // Our commission on this item
  agentMarkup?: number; // Agent's markup on this item

  // Cancellation policy
  cancellationPolicy?: {
    freeCancellationUntil?: string; // ISO date
    cancellationDeadline?: string; // ISO date
    refundRules: Array<{
      daysBeforeTravel: number;
      refundPercentage: number; // 0-100
    }>;
    nonRefundable?: boolean;
  };

  // Booking confirmation
  bookingStatus?: 'not_booked' | 'pending' | 'confirmed' | 'booked' | 'failed' | 'cancelled' | 'holding' | 'price_checking' | 'price_changed' | 'booking_in_progress' | 'awaiting_supplier' | 'awaiting_passenger_details';
  confirmationNumber?: string;
  confirmedAt?: string;
}

export interface FlightDetails {
  departure_airport: string;
  arrival_airport: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
}

export interface HotelDetails {
  hotel_name: string;
  location: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
}

export interface ActivityDetails {
  location: string;
  duration: number;
  category: string;
  description: string;
}

export interface TransferDetails {
  from: string;
  to: string;
  vehicle_type: string;
  duration: number;
}

// react-big-calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: 'flight' | 'hotel' | 'activity' | 'transfer';
    contactId: string;
    quoteId: string;
    details: Record<string, unknown>;
  };
}

// AI itinerary chat: mutations the /api/chat route returns for the client to apply
export type ChatAction =
  | { type: 'create_quote'; title: string; contactId?: string; customerName: string; startDate: string; endDate: string }
  | { type: 'add_item'; item: Omit<TravelItem, 'id'> }
  | { type: 'update_item'; itemId: string; updates: Partial<TravelItem> }
  | { type: 'remove_item'; itemId: string };

// Export financial types
export * from './financial';
export * from './booking';
export * from './payment';