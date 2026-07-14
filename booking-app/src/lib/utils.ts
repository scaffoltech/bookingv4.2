import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TravelItem } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getContactDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function getTravelItemColor(type: string): string {
  const colors = {
    flight: '#3B82F6',    // blue
    hotel: '#10B981',     // emerald
    activity: '#F59E0B',  // amber
    transfer: '#8B5CF6',  // violet
  };
  return colors[type as keyof typeof colors] || '#6B7280'; // gray fallback
}

export function calculateQuoteTotal(items: TravelItem[]): number {
  return items.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'number' && !Number.isNaN(item.quantity)
      ? item.quantity
      : 1;

    const price = typeof item.price === 'number' && !Number.isNaN(item.price)
      ? item.price
      : 0;

    return sum + price * quantity;
  }, 0);
}

export function calculateTripDuration(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Destination validation utilities
export interface DestinationMismatch {
  flightName: string;
  flightDestination: string;
  hotelName: string;
  hotelCity: string;
}

/**
 * Normalize location strings for comparison
 * Handles: "Paris", "Paris, France", "CDG", "PARIS", etc.
 */
function normalizeLocation(location: string): string {
  if (!location) return '';

  // Remove airport codes, country names, extra whitespace
  return location
    .toLowerCase()
    .trim()
    .replace(/,.*$/, '') // Remove everything after comma
    .replace(/\s+\(.+\)/, '') // Remove parenthetical info
    .replace(/[^a-z\s]/g, '') // Remove special chars
    .trim();
}

/**
 * Extract destination from flight details
 */
export function extractFlightDestination(flightDetails: Record<string, unknown>): string | null {
  // Check various possible fields where destination might be stored
  const possibleFields = [
    'arrivalAirport',
    'arrival_airport',
    'arrivalCity',
    'arrival_city',
    'destination',
    'to',
    'arrivalAirportCode',
  ];

  for (const field of possibleFields) {
    const value = flightDetails[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Check nested structures
  if (flightDetails.outboundFlight && typeof flightDetails.outboundFlight === 'object') {
    const nested = flightDetails.outboundFlight as Record<string, unknown>;
    const arrival = nested.arrivalAirport || nested.arrivalCity;
    if (typeof arrival === 'string') return arrival.trim();
  }

  return null;
}

/**
 * Extract city from hotel details
 */
export function extractHotelCity(hotelDetails: Record<string, unknown>): string | null {
  // Check various possible fields where city might be stored
  const possibleFields = ['city', 'location', 'address', 'hotelCity'];

  for (const field of possibleFields) {
    const value = hotelDetails[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Check nested location object
  if (hotelDetails.location && typeof hotelDetails.location === 'object') {
    const loc = hotelDetails.location as Record<string, unknown>;
    const city = loc.city || loc.address;
    if (typeof city === 'string') return city.trim();
  }

  return null;
}

/**
 * Check if two locations match (fuzzy matching)
 */
function locationsMatch(location1: string, location2: string): boolean {
  const norm1 = normalizeLocation(location1);
  const norm2 = normalizeLocation(location2);

  if (!norm1 || !norm2) return true; // If we can't extract, assume match

  // Exact match
  if (norm1 === norm2) return true;

  // One contains the other (e.g., "paris" in "paris charles de gaulle")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  return false;
}

/**
 * Detect destination mismatches between flights and hotels
 */
export function detectDestinationMismatches(
  items: TravelItem[]
): DestinationMismatch[] {
  const mismatches: DestinationMismatch[] = [];

  const flights = items.filter(item => item.type === 'flight');
  const hotels = items.filter(item => item.type === 'hotel');

  // If no flights or no hotels, no mismatches possible
  if (flights.length === 0 || hotels.length === 0) return mismatches;

  // Check each flight against each hotel
  for (const flight of flights) {
    const flightDestination = extractFlightDestination(flight.details);
    if (!flightDestination) continue;

    for (const hotel of hotels) {
      const hotelCity = extractHotelCity(hotel.details);
      if (!hotelCity) continue;

      // Check if destinations don't match
      if (!locationsMatch(flightDestination, hotelCity)) {
        mismatches.push({
          flightName: flight.name,
          flightDestination,
          hotelName: hotel.name,
          hotelCity,
        });
      }
    }
  }

  return mismatches;
}