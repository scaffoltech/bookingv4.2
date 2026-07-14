import { hotelAPI } from './api-client';
import {
  EnhancedHotelDetails,
  APISearchRequest,
  APISearchResponse,
} from '@/types/booking';
import { SimplifiedHotel } from '@/types/hotelbeds';

// Mock hotel data for development
const mockHotels: EnhancedHotelDetails[] = [
  {
    hotelName: 'The Plaza Hotel',
    hotelChain: 'Fairmont',
    hotelRating: 5,
    location: {
      address: 'Fifth Avenue at Central Park South',
      city: 'New York',
      country: 'United States',
      coordinates: {
        latitude: 40.7644,
        longitude: -73.9744,
      },
    },
    checkIn: {
      date: '2024-03-15',
      time: '15:00',
    },
    checkOut: {
      date: '2024-03-18',
      time: '11:00',
    },
    nights: 3,
    roomType: 'Deluxe King Room',
    roomDescription: 'Elegant room with king bed and city views',
    bedConfiguration: '1 King Bed',
    maxOccupancy: 2,
    guests: {
      adults: 2,
      children: 0,
    },
    mealPlan: 'breakfast',
    amenities: [
      'Free WiFi',
      'Air Conditioning',
      'Mini Bar',
      'Room Service',
      'Spa',
      'Fitness Center',
      'Concierge',
    ],
    cancellationPolicy: 'Free cancellation until 24 hours before check-in',
    totalPrice: 1500,
    priceBreakdown: {
      roomRate: 1350,
      taxes: 120,
      fees: 30,
    },
  },
  {
    hotelName: 'Marriott Downtown',
    hotelChain: 'Marriott',
    hotelRating: 4,
    location: {
      address: '123 Business District',
      city: 'Los Angeles',
      country: 'United States',
      coordinates: {
        latitude: 34.0522,
        longitude: -118.2437,
      },
    },
    checkIn: {
      date: '2024-03-20',
      time: '16:00',
    },
    checkOut: {
      date: '2024-03-22',
      time: '12:00',
    },
    nights: 2,
    roomType: 'Executive Suite',
    roomDescription: 'Spacious suite with separate living area',
    bedConfiguration: '1 King Bed',
    maxOccupancy: 4,
    guests: {
      adults: 2,
      children: 1,
      childrenAges: [8],
    },
    mealPlan: 'room-only',
    amenities: [
      'Free WiFi',
      'Pool',
      'Business Center',
      'Parking',
      'Restaurant',
      'Bar',
    ],
    cancellationPolicy: 'Free cancellation until 48 hours before check-in',
    totalPrice: 650,
    priceBreakdown: {
      roomRate: 580,
      taxes: 50,
      fees: 20,
    },
  },
];

export class HotelService {
  private searchCache: Record<string, { data: APISearchResponse<EnhancedHotelDetails>; timestamp: number }> = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // HotelBeds API calls are now handled by backend API routes
    console.log('HotelService initialized - using backend API proxy');
  }

  private getCacheKey(request: APISearchRequest): string {
    return `${request.destination}-${request.checkIn}-${request.checkOut}-${request.adults || 2}-${request.children || 0}-${request.rooms || 1}`;
  }

  private getCachedSearch(cacheKey: string): APISearchResponse<EnhancedHotelDetails> | null {
    const cached = this.searchCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('✅ Returning cached hotel search results');
      return cached.data;
    }
    return null;
  }

  private setCachedSearch(cacheKey: string, data: APISearchResponse<EnhancedHotelDetails>): void {
    this.searchCache[cacheKey] = { data, timestamp: Date.now() };
    // Clean up old cache entries
    const now = Date.now();
    Object.keys(this.searchCache).forEach(key => {
      if (now - this.searchCache[key].timestamp > this.CACHE_DURATION) {
        delete this.searchCache[key];
      }
    });
  }

  private convertSimplifiedToEnhanced(hotel: SimplifiedHotel, nights: number): EnhancedHotelDetails {
    // Import markup utilities
    const { calculateClientPrice, calculateProfit } = require('@/lib/pricing/markup-config');

    // hotel.price is the supplier cost (what HotelBeds charges)
    const supplierCost = hotel.price;

    // Apply markup to get client price
    const clientPrice = calculateClientPrice(supplierCost);

    // Calculate profit
    const profit = calculateProfit(supplierCost, clientPrice);

    // Calculate breakdown ensuring total equals sum of parts (no rounding discrepancies)
    const totalPrice = clientPrice;
    const taxes = Math.round(totalPrice * 0.12);
    const fees = Math.round(totalPrice * 0.03);
    const roomRate = totalPrice - taxes - fees; // Balance automatically

    return {
      hotelName: hotel.name,
      hotelChain: 'Unknown',
      hotelRating: hotel.rating || 3,
      location: {
        address: hotel.location,
        city: hotel.location.split(',')[0] || '',
        country: hotel.location.split(',')[1]?.trim() || '',
        coordinates: hotel.coordinates || {
          latitude: 0,
          longitude: 0
        }
      },
      checkIn: {
        date: hotel.checkIn,
        time: '15:00'
      },
      checkOut: {
        date: hotel.checkOut,
        time: '11:00'
      },
      nights,
      roomType: hotel.roomType || 'Standard Room',
      roomDescription: hotel.description || 'Comfortable accommodation',
      bedConfiguration: '1 King Bed',
      maxOccupancy: 2,
      guests: {
        adults: 2,
        children: 0
      },
      mealPlan: 'room-only',
      amenities: hotel.amenities || ['Free WiFi', 'Air Conditioning'],
      cancellationPolicy: 'Please check with hotel for cancellation policy',
      totalPrice,
      priceBreakdown: {
        roomRate,
        taxes,
        fees
      },
      rateKey: hotel.rateKey,
      // NEW: Add cost tracking fields
      supplierCost,     // What HotelBeds charges
      clientPrice,      // What client pays (with markup)
      profit            // Markup amount
    };
  }

  async searchHotels(request: APISearchRequest): Promise<APISearchResponse<EnhancedHotelDetails>> {
    console.log('Hotel search request:', request);

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.getCachedSearch(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Call our internal API route
      const checkIn = request.checkIn;
      const checkOut = request.checkOut;
      const adults = request.passengers?.adults || request.adults || 2;
      const children = request.passengers?.children || request.children || 0;
      const rooms = request.rooms || 1;

      if (!request.destination || !checkIn || !checkOut) {
        throw new Error('Destination, check-in and check-out dates are required');
      }

      console.log('Calling internal hotel search API with:', {
        destination: request.destination,
        checkIn,
        checkOut,
        adults,
        children,
        rooms
      });

      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: request.destination,
          checkIn,
          checkOut,
          adults,
          children,
          rooms,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Hotel API Error:', errorData);

        // Provide detailed error information based on error type
        if (errorData.errorType === 'MISSING_CREDENTIALS') {
          throw new Error(`Configuration Error: ${errorData.error}\n\nSolution: ${errorData.details?.suggestion}`);
        } else if (errorData.errorType === 'HOTELBEDS_API_ERROR') {
          throw new Error(`HotelBeds API Error: ${errorData.details?.message}\n\nSuggestion: ${errorData.details?.suggestion}`);
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const apiResponse = await response.json();
      console.log('✅ Internal API response:', apiResponse.source, 'returned', apiResponse.data?.length || 0, 'hotels');

      if (apiResponse.success && apiResponse.data) {
        const nights = this.calculateNights(checkIn, checkOut);
        let enhancedHotels = apiResponse.data.map((hotel: SimplifiedHotel) =>
          this.convertSimplifiedToEnhanced(hotel, nights)
        );

        // Apply filters
        if (request.filters?.priceRange) {
          enhancedHotels = enhancedHotels.filter(
            hotel =>
              hotel.totalPrice >= (request.filters?.priceRange?.min || 0) &&
              hotel.totalPrice <= (request.filters?.priceRange?.max || Infinity)
          );
        }

        if (request.filters?.hotelRating) {
          enhancedHotels = enhancedHotels.filter(
            hotel => hotel.hotelRating >= (request.filters?.hotelRating || 0)
          );
        }

        const response: APISearchResponse<EnhancedHotelDetails> = {
          success: true,
          data: enhancedHotels,
          metadata: {
            totalResults: enhancedHotels.length,
            searchId: apiResponse.metadata?.searchId || Math.random().toString(36).substring(2, 15),
            timestamp: apiResponse.metadata?.timestamp || new Date().toISOString(),
            source: apiResponse.source,
          },
        };

        // Cache the successful response
        this.setCachedSearch(cacheKey, response);

        return response;
      } else {
        throw new Error(apiResponse.error || 'Invalid API response');
      }
    } catch (error) {
      console.error('Hotel search API error:', error);
      throw error;
    }
  }

  async getHotelDetails(hotelId: string): Promise<EnhancedHotelDetails | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockHotels[0]);
      }, 500);
    });
  }

  async checkRoomAvailability(
    _hotelId: string,
    _checkIn: string,
    _checkOut: string,
    _guests: { adults: number; children: number }
  ): Promise<{ available: boolean; rooms: number; price?: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          available: true,
          rooms: Math.floor(Math.random() * 10) + 1,
          price: Math.floor(Math.random() * 500) + 100,
        });
      }, 500);
    });
  }

  async bookHotel(
    _hotelDetails: EnhancedHotelDetails,
    _guestDetails: { name: string; email: string; phone: string }
  ): Promise<{ confirmationNumber: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          confirmationNumber: `HTL${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        });
      }, 2000);
    });
  }

  async getHotelChains(): Promise<Array<{ code: string; name: string }>> {
    return [
      { code: 'MAR', name: 'Marriott' },
      { code: 'HIL', name: 'Hilton' },
      { code: 'HYA', name: 'Hyatt' },
      { code: 'IHG', name: 'InterContinental' },
      { code: 'ACC', name: 'Accor' },
      { code: 'WHG', name: 'Wyndham' },
      { code: 'CHO', name: 'Choice Hotels' },
      { code: 'BW', name: 'Best Western' },
    ];
  }

  async getAmenities(): Promise<string[]> {
    return [
      'Free WiFi',
      'Pool',
      'Spa',
      'Fitness Center',
      'Restaurant',
      'Bar',
      'Business Center',
      'Parking',
      'Pet Friendly',
      'Airport Shuttle',
      'Room Service',
      'Concierge',
      'Laundry Service',
      'Air Conditioning',
      'Kitchen/Kitchenette',
    ];
  }

  calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // Validate date order
    if (end.getTime() <= start.getTime()) {
      throw new Error('Check-out date must be after check-in date');
    }

    const diffTime = end.getTime() - start.getTime(); // No need for Math.abs now
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getRoomTypes(): string[] {
    return [
      'Standard Room',
      'Deluxe Room',
      'Superior Room',
      'Executive Room',
      'Junior Suite',
      'Suite',
      'Presidential Suite',
      'Family Room',
      'Connecting Rooms',
    ];
  }

  getMealPlans(): Array<{ value: string; label: string }> {
    return [
      { value: 'room-only', label: 'Room Only' },
      { value: 'breakfast', label: 'Breakfast Included' },
      { value: 'half-board', label: 'Half Board (Breakfast & Dinner)' },
      { value: 'full-board', label: 'Full Board (All Meals)' },
      { value: 'all-inclusive', label: 'All Inclusive' },
    ];
  }
}

export const hotelService = new HotelService();