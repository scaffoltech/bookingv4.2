import crypto from 'crypto';
import { getHotelBedsBaseUrl } from '@/lib/hotelbeds/auth';
import {
  HotelBedsCredentials,
  HotelBedsSearchRequest,
  HotelBedsSearchResponse,
  HotelBedsDestinationsResponse,
  HotelBedsApiError,
  SimplifiedHotel
} from '@/types/hotelbeds';

export class HotelBedsClient {
  private apiKey: string;
  private secret: string;
  private baseUrl: string;

  // Common destination mappings for major cities
  private static destinationCodes: Record<string, string> = {
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'london': 'LON',
    'paris': 'PAR',
    'rome': 'ROM',
    'amsterdam': 'AMS',
    'berlin': 'BER',
    'vienna': 'VIE',
    'prague': 'PRG',
    'lisbon': 'LIS',
    'dublin': 'DUB',
    'zurich': 'ZUR',
    'milan': 'MIL',
    'florence': 'FLR',
    'venice': 'VCE',
    'athens': 'ATH',
    'istanbul': 'IST',
    'new york': 'NYC',
    'los angeles': 'LAX',
    'chicago': 'CHI',
    'miami': 'MIA',
    'tokyo': 'TYO',
    'singapore': 'SIN',
    'hong kong': 'HKG',
    'dubai': 'DXB'
  };

  constructor(credentials: HotelBedsCredentials) {
    this.apiKey = credentials.apiKey;
    this.secret = credentials.secret;
    this.baseUrl = getHotelBedsBaseUrl();
  }

  // Convert city name to destination code
  private getDestinationCode(destination: string): string {
    const normalizedDestination = destination.toLowerCase().trim();
    const code = HotelBedsClient.destinationCodes[normalizedDestination];

    if (!code) {
      console.warn(`⚠️ No destination code found for "${destination}". Using as-is. This may cause API failures.`);
      return destination;
    }

    console.log(`✅ Mapped "${destination}" to destination code "${code}"`);
    return code;
  }

  private generateSignature(timestamp: number): string {
    const message = this.apiKey + this.secret + timestamp;
    const signature = crypto.createHash('sha256').update(message).digest('hex');
    return signature;
  }

  private getHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    return {
      'Api-Key': this.apiKey,
      'X-Signature': signature,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    console.log('🌐 HotelBeds API Request:', {
      url,
      method,
      headers: {
        ...headers,
        'X-Signature': headers['X-Signature'] ? `${headers['X-Signature'].substring(0, 8)}...` : 'Missing'
      },
      bodyPreview: body ? JSON.stringify(body).substring(0, 200) + '...' : 'No body'
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      console.log('📡 HotelBeds API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ HotelBeds API Error Response:', errorData);

        throw new HotelBedsApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          response.status,
          errorData.errors
        );
      }

      const responseData = await response.json();
      console.log('✅ HotelBeds API Success:', {
        hotelsFound: responseData.hotels?.hotels?.length || 0,
        totalResults: responseData.hotels?.total || 0,
        checkIn: responseData.hotels?.checkIn,
        checkOut: responseData.hotels?.checkOut
      });

      return responseData;
    } catch (error) {
      if (error instanceof HotelBedsApiError) {
        throw error;
      }

      console.error('🔥 Network/Parse Error:', error);
      throw new HotelBedsApiError(
        error instanceof Error ? error.message : 'Unknown API error'
      );
    }
  }

  async searchHotels(searchParams: HotelBedsSearchRequest): Promise<HotelBedsSearchResponse> {
    return this.makeRequest<HotelBedsSearchResponse>(
      '/hotel-api/1.0/hotels',
      'POST',
      searchParams
    );
  }

  async getDestinations(
    countryCode?: string,
    from?: number,
    to?: number
  ): Promise<HotelBedsDestinationsResponse> {
    let endpoint = '/hotel-content-api/1.0/locations/destinations';
    const params = new URLSearchParams();

    if (countryCode) params.append('countryCodes', countryCode);
    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest<HotelBedsDestinationsResponse>(endpoint);
  }

  // Utility method to convert HotelBeds response to our simplified format
  static convertToSimplifiedHotels(
    response: HotelBedsSearchResponse,
    checkIn: string,
    checkOut: string
  ): SimplifiedHotel[] {
    if (!response.hotels?.hotels) {
      return [];
    }

    return response.hotels.hotels.map(hotel => {
      const lowestRate = hotel.rooms?.reduce((min, room) => {
        const roomMin = room.rates.reduce((rMin, rate) =>
          Math.min(rMin, rate.net || rate.sellingRate), Infinity
        );
        return Math.min(min, roomMin);
      }, Infinity) || 0;

      const highestRate = hotel.rooms?.reduce((max, room) => {
        const roomMax = room.rates.reduce((rMax, rate) =>
          Math.max(rMax, rate.net || rate.sellingRate), 0
        );
        return Math.max(max, roomMax);
      }, 0) || 0;

      const bestRoom = hotel.rooms?.[0];
      const bestRate = bestRoom?.rates?.[0];

      // Generate a simple image URL (HotelBeds doesn't provide images in search)
      const imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(hotel.name)}`;

      return {
        id: hotel.code.toString(),
        name: hotel.name,
        description: hotel.description,
        location: `${hotel.city || ''}, ${hotel.countryCode}`.trim(),
        rating: hotel.categoryCode ? parseInt(hotel.categoryCode) : undefined,
        price: lowestRate === highestRate ? lowestRate : lowestRate,
        currency: hotel.currency || 'EUR',
        imageUrl,
        amenities: hotel.boardCodes || [],
        coordinates: hotel.latitude && hotel.longitude ? {
          latitude: hotel.latitude,
          longitude: hotel.longitude
        } : undefined,
        checkIn,
        checkOut,
        roomType: bestRoom?.name,
        availability: bestRate?.rateType === 'BOOKABLE' ? 'available' : 'limited',
        rateKey: bestRate?.rateKey
      };
    });
  }

  // Quick search method that returns simplified hotels
  async searchSimplifiedHotels(
    destination: string,
    checkIn: string,
    checkOut: string,
    rooms: number = 1,
    adults: number = 2,
    children: number = 0
  ): Promise<SimplifiedHotel[]> {
    const searchRequest: HotelBedsSearchRequest = {
      stay: {
        checkIn,
        checkOut
      },
      occupancies: [{
        rooms,
        adults,
        children
      }],
      destination: {
        code: this.getDestinationCode(destination)
      },
      filter: {
        maxHotels: 50,
        packaging: false
      },
      dailyRate: false
    };

    const response = await this.searchHotels(searchRequest);
    return HotelBedsClient.convertToSimplifiedHotels(response, checkIn, checkOut);
  }
}

// Custom error class for HotelBeds API errors
class HotelBedsApiError extends Error {
  public code: string;
  public status?: number;
  public errors?: any[];

  constructor(message: string, code?: string, status?: number, errors?: any[]) {
    super(message);
    this.name = 'HotelBedsApiError';
    this.code = code || 'UNKNOWN_ERROR';
    this.status = status;
    this.errors = errors;
  }
}