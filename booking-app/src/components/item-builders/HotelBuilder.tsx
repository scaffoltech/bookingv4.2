'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Hotel,
  Calendar,
  Clock,
  Loader2,
  Search,
  Star,
  MapPin,
  Wifi,
  Car,
  Coffee,
  X
} from 'lucide-react';
import { hotelService } from '@/services/hotel-api';
import {
  EnhancedHotelDetails
} from '@/types/booking';
import { formatCurrency } from '@/lib/utils';
import { useRateStore } from '@/store/rate-store';
import { HotelRate } from '@/types/rate';
import { calculateClientPrice, getMarkupPercentage } from '@/lib/pricing/markup-config';
import { findMatchingRate, getSupplierFromMatch, getSupplierSourceFromMatch } from '@/lib/pricing/rate-matcher';
import { TravelItem } from '@/types';

interface HotelBuilderProps {
  onSubmit: (hotelData: {
    type: string;
    name: string;
    startDate: string;
    endDate: string;
    price: number;
    quantity: number;
    source?: 'api' | 'manual';
    apiProvider?: 'hotelbeds' | 'amadeus' | 'sabre';
    supplierCost?: number;
    clientPrice?: number;
    details: EnhancedHotelDetails;
  }) => void;
  onCancel: () => void;
  tripStartDate?: Date;
  tripEndDate?: Date;
}

type TabType = 'offline' | 'manual' | 'api';

export function HotelBuilder({ onSubmit, onCancel, tripStartDate, tripEndDate }: HotelBuilderProps) {
  const { getRatesByType, searchRates, getRatesByDateRange, rates } = useRateStore();
  const [activeTab, setActiveTab] = useState<TabType>('offline');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EnhancedHotelDetails[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<EnhancedHotelDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // State for reactive occupancy-based rate calculations
  const [calculatedRates, setCalculatedRates] = useState<Map<string, {
    baseRate: number;
    clientPrice: number;
    markupPercentage: number;
    perNightRate: number;
    totalNights: number;
  }>>(new Map());

  // Offline tab specific search state
  const [offlineSearchDates, setOfflineSearchDates] = useState({
    checkIn: tripStartDate ? tripStartDate.toISOString().split('T')[0] : '',
    checkOut: tripEndDate ? tripEndDate.toISOString().split('T')[0] : '',
  });

  // State for rates to display (synchronized with calculations)
  const [ratesToDisplay, setRatesToDisplay] = useState<HotelRate[]>([]);

  const [formData, setFormData] = useState({
    destination: '',
    checkInDate: tripStartDate ? tripStartDate.toISOString().split('T')[0] : '',
    checkOutDate: tripEndDate ? tripEndDate.toISOString().split('T')[0] : '',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    adults: 2,
    children: 0,
    childrenAges: [] as number[],
    roomType: '',
    mealPlan: 'room-only',
    hotelRating: 3,
    priceRange: {
      min: 0,
      max: 1000,
    },
    // Manual entry fields
    hotelName: '',
    location: '',
    price: '',
    quantity: '1',
    supplier: '',
    commissionPercent: '',
  });

  const [nights, setNights] = useState(0);
  const mealPlans = hotelService.getMealPlans();

  // Get hotel rates filtered by trip dates
  const hotelRatesInDateRange = (() => {
    if (!tripStartDate || !tripEndDate) {
      return getRatesByType('hotel') as HotelRate[];
    }

    const startStr = tripStartDate.toISOString().split('T')[0];
    const endStr = tripEndDate.toISOString().split('T')[0];

    return getRatesByDateRange(startStr, endStr)
      .filter(r => r.type === 'hotel') as HotelRate[];
  })();

  // Filter rates based on search (within date range)
  const filteredRates = searchQuery
    ? searchRates(searchQuery).filter(r =>
        r.type === 'hotel' &&
        hotelRatesInDateRange.some(hr => hr.id === r.id)
      ) as HotelRate[]
    : hotelRatesInDateRange;

  // Calculate nights when dates change
  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate) {
      const calculatedNights = hotelService.calculateNights(
        formData.checkInDate,
        formData.checkOutDate
      );
      setNights(calculatedNights);
    }
  }, [formData.checkInDate, formData.checkOutDate]);

  // Recalculate all rates when occupancy or dates change
  useEffect(() => {
    // Only recalculate if we have valid dates
    if (!offlineSearchDates.checkIn || !offlineSearchDates.checkOut) {
      return;
    }

    const newCalculatedRates = new Map();

    // Get fresh rates directly from store (eliminates stale closure)
    let ratesToCalculate = getRatesByType('hotel') as HotelRate[];

    // Filter by trip date range if available
    if (tripStartDate && tripEndDate) {
      const startStr = tripStartDate.toISOString().split('T')[0];
      const endStr = tripEndDate.toISOString().split('T')[0];
      ratesToCalculate = getRatesByDateRange(startStr, endStr).filter(r => r.type === 'hotel') as HotelRate[];
    }

    // Apply search filter if query exists
    if (searchQuery) {
      ratesToCalculate = searchRates(searchQuery).filter(r =>
        r.type === 'hotel' && ratesToCalculate.some(hr => hr.id === r.id)
      ) as HotelRate[];
    }

    ratesToCalculate.forEach(rate => {
      const calculated = calculateRateForOccupancy(
        rate,
        formData.adults,
        formData.children,
        offlineSearchDates.checkIn,
        offlineSearchDates.checkOut
      );
      newCalculatedRates.set(rate.id, calculated);
    });

    setCalculatedRates(newCalculatedRates);
    setRatesToDisplay(ratesToCalculate);
  }, [formData.adults, formData.children, offlineSearchDates.checkIn, offlineSearchDates.checkOut,
      searchQuery, getRatesByType, getRatesByDateRange, searchRates, tripStartDate, tripEndDate]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const response = await hotelService.searchHotels({
        type: 'hotel',
        destination: formData.destination,
        checkIn: formData.checkInDate,
        checkOut: formData.checkOutDate,
        passengers: {
          adults: formData.adults,
          children: formData.children,
          infants: 0,
        },
        rooms: 1, // For now, assume 1 room - can be enhanced later
        filters: {
          hotelRating: formData.hotelRating,
          priceRange: formData.priceRange,
        },
      });

      if (response.success && response.data) {
        setSearchResults(response.data);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Hotel search failed:', error);

      // Show detailed error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Configuration Error')) {
        alert(`🔧 Setup Required:\n\n${errorMessage}\n\nContact your developer to configure the HotelBeds API credentials.`);
      } else if (errorMessage.includes('HotelBeds API Error')) {
        alert(`🔗 API Error:\n\n${errorMessage}\n\nThis might be a temporary issue. Please try again in a few minutes.`);
      } else {
        alert(`❌ Search Failed:\n\n${errorMessage}\n\nPlease check your search criteria and try again.`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Helper: Calculate nights between two dates
  const calculateNightsBetween = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate rate based on occupancy with markup applied
  // Rate in database is ALREADY per-night, just multiply by nights selected
  const calculateRateForOccupancy = (
    rate: HotelRate,
    adults: number,
    children: number,
    userCheckIn: string,
    userCheckOut: string
  ) => {
    const totalGuests = adults + children;

    // Use occupancy-specific PER-NIGHT rate if available (nett/supplier cost per night)
    let perNightRate = rate.rate; // fallback to base rate

    if (totalGuests === 1 && rate.singleRate) perNightRate = rate.singleRate;
    else if (totalGuests === 2 && rate.doubleRate) perNightRate = rate.doubleRate;
    else if (totalGuests === 3 && rate.tripleRate) perNightRate = rate.tripleRate;
    else if (totalGuests >= 4 && rate.quadRate) perNightRate = rate.quadRate;

    // Calculate user's selected nights
    const userNights = calculateNightsBetween(userCheckIn, userCheckOut);

    // Calculate total nett cost for user's stay
    const baseRateTotal = perNightRate * userNights;

    // Apply markup to get client price (nett rates uploaded need markup added)
    const markupPercentage = getMarkupPercentage();
    const clientPrice = calculateClientPrice(baseRateTotal, markupPercentage);

    return {
      baseRate: baseRateTotal,          // supplier/nett cost for entire stay
      clientPrice,                       // what customer pays (with markup) for entire stay
      markupPercentage,
      perNightRate,                      // nett rate per night
      totalNights: userNights
    };
  };

  const handleSelectRate = (rate: HotelRate) => {
    // Use offline search dates for date-aware pricing
    const userCheckIn = offlineSearchDates.checkIn || rate.checkIn;
    const userCheckOut = offlineSearchDates.checkOut || rate.checkOut;

    const checkIn = userCheckIn ? new Date(userCheckIn).toISOString() : new Date(rate.checkIn).toISOString();
    const checkOut = userCheckOut ? new Date(userCheckOut).toISOString() : new Date(rate.checkOut).toISOString();

    // Calculate price based on occupancy AND user's selected dates with markup
    const calculated = calculateRateForOccupancy(
      rate,
      formData.adults,
      formData.children,
      userCheckIn,
      userCheckOut
    );

    // Directly submit the hotel
    onSubmit({
      type: 'hotel',
      name: rate.propertyName,
      startDate: checkIn,
      endDate: checkOut,
      price: calculated.clientPrice, // Client pays marked-up price for selected dates
      quantity: 1,
      details: {
        hotelName: rate.propertyName,
        hotelCode: rate.propertyCode,
        roomType: rate.roomType,
        mealPlan: rate.mealPlan,
        totalPrice: calculated.clientPrice,
        location: {
          city: '',
          country: '',
          address: ''
        },
        hotelRating: 3,
        amenities: [],
        cancellationPolicy: '',
        checkIn: {
          date: userCheckIn,
          time: '15:00'
        },
        checkOut: {
          date: userCheckOut,
          time: '11:00'
        },
        guests: {
          adults: formData.adults,
          children: formData.children,
          childrenAges: formData.childrenAges
        },
        supplierSource: rate.source,
        supplier: rate.supplier,
        commissionPercent: rate.commissionPercent,
        clientPrice: calculated.clientPrice,      // What customer pays (with markup) for selected dates
        supplierCost: calculated.baseRate         // Nett cost from supplier for selected dates
      },
    });
  };

  const handleSelectHotel = (hotel: EnhancedHotelDetails) => {
    // Try to match this hotel to uploaded rates to get accurate supplier cost
    const mockItem: TravelItem = {
      id: 'temp',
      type: 'hotel',
      name: hotel.hotelName,
      startDate: formData.checkInDate,
      endDate: formData.checkOutDate,
      price: hotel.totalPrice,
      quantity: 1,
      details: hotel
    };

    const rateMatch = findMatchingRate(mockItem, rates);

    if (rateMatch.matched && rateMatch.supplierCost) {
      // Use matched rate's supplier cost
      const updatedHotel: EnhancedHotelDetails = {
        ...hotel,
        supplierCost: rateMatch.supplierCost,
        clientPrice: hotel.totalPrice,
        profit: hotel.totalPrice - rateMatch.supplierCost
      };
      setSelectedHotel(updatedHotel);
    } else {
      // Use API price as both supplier cost and client price (no profit margin visible)
      // In reality, HotelBeds API includes their commission
      setSelectedHotel({
        ...hotel,
        supplierCost: hotel.supplierCost || hotel.totalPrice * 0.85, // Estimate 15% margin
        clientPrice: hotel.totalPrice,
        profit: hotel.totalPrice - (hotel.supplierCost || hotel.totalPrice * 0.85)
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      type: 'hotel',
      name: formData.hotelName,
      startDate: `${formData.checkInDate}T${formData.checkInTime}`,
      endDate: `${formData.checkOutDate}T${formData.checkOutTime}`,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity),
      details: {
        hotelName: formData.hotelName,
        hotelCode: '',
        roomType: formData.roomType,
        mealPlan: formData.mealPlan,
        totalPrice: parseFloat(formData.price),
        location: {
          city: formData.location,
          country: '',
          address: ''
        },
        hotelRating: formData.hotelRating,
        amenities: [],
        cancellationPolicy: '',
        checkIn: {
          date: formData.checkInDate,
          time: formData.checkInTime
        },
        checkOut: {
          date: formData.checkOutDate,
          time: formData.checkOutTime
        },
        guests: {
          adults: formData.adults,
          children: formData.children,
          childrenAges: formData.childrenAges
        },
        supplier: formData.supplier || undefined,
        commissionPercent: formData.commissionPercent ? parseFloat(formData.commissionPercent) : undefined,
        clientPrice: parseFloat(formData.price),
        supplierCost: formData.commissionPercent
          ? parseFloat(formData.price) * (1 - parseFloat(formData.commissionPercent) / 100)
          : parseFloat(formData.price) * 0.9
      },
    });
  };

  const handleConfirmBooking = () => {
    if (!selectedHotel) return;

    const hotelData = {
      type: 'hotel',
      name: selectedHotel.hotelName,
      startDate: `${formData.checkInDate}T${formData.checkInTime}`,
      endDate: `${formData.checkOutDate}T${formData.checkOutTime}`,
      price: selectedHotel.totalPrice,
      quantity: 1,
      source: 'api' as const,
      apiProvider: 'hotelbeds' as const,
      // Add cost tracking fields
      supplierCost: selectedHotel.supplierCost,
      clientPrice: selectedHotel.clientPrice,
      details: {
        ...selectedHotel,
        checkIn: {
          date: formData.checkInDate,
          time: formData.checkInTime,
        },
        checkOut: {
          date: formData.checkOutDate,
          time: formData.checkOutTime,
        },
        guests: {
          adults: formData.adults,
          children: formData.children,
          childrenAges: formData.childrenAges,
        },
      },
    };

    onSubmit(hotelData);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getAmenityIcon = (amenity: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      'Free WiFi': <Wifi className="w-4 h-4" />,
      'Parking': <Car className="w-4 h-4" />,
      'Breakfast': <Coffee className="w-4 h-4" />,
    };
    return iconMap[amenity] || null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Hotel className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Add Hotel</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('offline')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'offline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Offline Rates ({hotelRatesInDateRange.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            API Search
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab 1: Offline Rates */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <Label htmlFor="offlineCheckIn" className="text-sm font-medium text-gray-700">Check-in Date</Label>
                  <Input
                    id="offlineCheckIn"
                    type="date"
                    value={offlineSearchDates.checkIn}
                    onChange={(e) => setOfflineSearchDates({ ...offlineSearchDates, checkIn: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="offlineCheckOut" className="text-sm font-medium text-gray-700">Check-out Date</Label>
                  <Input
                    id="offlineCheckOut"
                    type="date"
                    value={offlineSearchDates.checkOut}
                    onChange={(e) => setOfflineSearchDates({ ...offlineSearchDates, checkOut: e.target.value })}
                    min={offlineSearchDates.checkIn}
                    className="mt-1"
                  />
                </div>
                {offlineSearchDates.checkIn && offlineSearchDates.checkOut && (
                  <div className="col-span-2 text-sm font-medium text-green-700 bg-green-100 px-3 py-2 rounded-lg text-center">
                    {calculateNightsBetween(offlineSearchDates.checkIn, offlineSearchDates.checkOut)} nights • {offlineSearchDates.checkIn} to {offlineSearchDates.checkOut}
                  </div>
                )}
              </div>

              {/* Guest Selection */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <Label htmlFor="offlineAdults" className="text-sm font-medium text-gray-700">Adults</Label>
                  <Input
                    id="offlineAdults"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="offlineChildren" className="text-sm font-medium text-gray-700">Children</Label>
                  <Input
                    id="offlineChildren"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.children}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        children: count,
                        childrenAges: Array(count).fill(0)
                      });
                    }}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-2 rounded-lg w-full text-center">
                    Total: {formData.adults + formData.children} guests
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hotel name, location, or room type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Results */}
              {filteredRates.length === 0 ? (
                <div className="text-center py-12">
                  <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No hotels found' : 'No offline hotel rates uploaded'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search or switch to Manual Entry
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {ratesToDisplay.map((rate) => (
                    <button
                      key={rate.id}
                      onClick={() => handleSelectRate(rate)}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{rate.propertyName}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {rate.roomType}
                          </div>
                          {rate.mealPlan && (
                            <div className="text-xs text-gray-500 mt-1">
                              Meal Plan: {rate.mealPlan}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Check-in: {rate.checkIn} • Check-out: {rate.checkOut}
                          </div>
                          <div className="text-xs text-gray-500">
                            Supplier: {rate.supplier}
                          </div>
                        </div>
                        <div className="text-right min-w-[180px]">
                          {(() => {
                            const calculated = calculatedRates.get(rate.id);
                            if (!calculated) return null;

                            return (
                              <>
                                <div className="text-xs text-gray-600 font-medium">
                                  {rate.currency} {calculated.perNightRate.toFixed(2)}/night (nett)
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {calculated.totalNights} nights × {rate.currency} {calculated.perNightRate.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  = {rate.currency} {calculated.baseRate.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                  {rate.commissionPercent}% commission
                                </div>
                                <div className="text-xs text-purple-600">
                                  +{calculated.markupPercentage}% markup
                                </div>
                                <div className="text-sm font-bold text-blue-700 mt-2 bg-blue-50 px-2 py-1.5 rounded border border-blue-200">
                                  Total: {rate.currency} {calculated.clientPrice.toFixed(2)}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Manual Entry */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hotelName">Hotel Name *</Label>
                  <Input
                    id="hotelName"
                    required
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    placeholder="e.g., Hilton Garden Inn"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Miami, FL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roomType">Room Type</Label>
                  <Input
                    id="roomType"
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    placeholder="e.g., Standard King"
                  />
                </div>
                <div>
                  <Label htmlFor="mealPlanManual">Meal Plan</Label>
                  <Select
                    value={formData.mealPlan}
                    onValueChange={(value) => setFormData({ ...formData, mealPlan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealPlans.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkInDate">Check-in Date *</Label>
                  <Input
                    id="checkInDate"
                    type="date"
                    required
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="checkInTime">Check-in Time</Label>
                  <Input
                    id="checkInTime"
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkOutDate">Check-out Date *</Label>
                  <Input
                    id="checkOutDate"
                    type="date"
                    required
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    min={formData.checkInDate}
                  />
                </div>
                <div>
                  <Label htmlFor="checkOutTime">Check-out Time</Label>
                  <Input
                    id="checkOutTime"
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                  />
                </div>
              </div>

              {nights > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  {nights} night{nights > 1 ? 's' : ''} stay
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Total Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Rooms *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commission">Commission %</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.1"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Hotel chain or supplier name"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Add Hotel
                </Button>
              </div>
            </form>
          )}

          {/* Tab 3: API Search */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Destination */}
              <div>
            <Label htmlFor="destination">Destination</Label>
            <div className="relative">
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="City or Hotel Name"
                className="pl-8"
              />
              <MapPin className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
            </div>
          </div>

          {/* Check-in/out Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInDate">Check-in Date</Label>
              <div className="relative">
                <Input
                  id="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                  className="pl-8"
                />
                <Calendar className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="checkOutDate">Check-out Date</Label>
              <div className="relative">
                <Input
                  id="checkOutDate"
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkOutDate: e.target.value }))}
                  min={formData.checkInDate}
                  className="pl-8"
                />
                <Calendar className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Check-in/out Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInTime">Check-in Time</Label>
              <div className="relative">
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                  className="pl-8"
                />
                <Clock className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="checkOutTime">Check-out Time</Label>
              <div className="relative">
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                  className="pl-8"
                />
                <Clock className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {nights > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              {nights} night{nights > 1 ? 's' : ''} stay
            </div>
          )}

          {/* Guests */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="adults">Adults</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="10"
                value={formData.adults}
                onChange={(e) => setFormData(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                max="10"
                value={formData.children}
                onChange={(e) => {
                  const count = parseInt(e.target.value);
                  setFormData(prev => ({ 
                    ...prev, 
                    children: count,
                    childrenAges: Array(count).fill(0)
                  }));
                }}
              />
            </div>

            <div>
              <Label htmlFor="mealPlan">Meal Plan</Label>
              <Select
                value={formData.mealPlan}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, mealPlan: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealPlans.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hotel Preferences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rating">Minimum Rating</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="rating"
                  type="range"
                  min="1"
                  max="5"
                  value={formData.hotelRating}
                  onChange={(e) => setFormData(prev => ({ ...prev, hotelRating: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <div className="flex items-center space-x-1">
                  {renderStars(formData.hotelRating)}
                </div>
              </div>
            </div>

            <div>
              <Label>Price Range</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.priceRange.min}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      priceRange: { ...prev.priceRange, min: isNaN(value) ? 0 : value }
                    }));
                  }}
                  placeholder="Min"
                  className="w-24"
                />
                <span>-</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.priceRange.max}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      priceRange: { ...prev.priceRange, max: isNaN(value) ? 1000 : value }
                    }));
                  }}
                  placeholder="Max"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">per night</span>
              </div>
            </div>
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearch} 
            className="w-full" 
            disabled={isSearching || !formData.destination || !formData.checkInDate || !formData.checkOutDate}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching Hotels...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Hotels
              </>
            )}
          </Button>

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Available Hotels</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((hotel, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectHotel(hotel)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedHotel === hotel
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-semibold">{hotel.hotelName}</h5>
                          <div className="flex">{renderStars(hotel.hotelRating)}</div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {hotel.location.city}, {hotel.location.country}
                        </p>
                        
                        <p className="text-sm font-medium mb-1">{hotel.roomType}</p>
                        
                        {hotel.amenities && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {hotel.amenities.slice(0, 4).map((amenity, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center space-x-1">
                                {getAmenityIcon(amenity)}
                                <span>{amenity}</span>
                              </span>
                            ))}
                            {hotel.amenities.length > 4 && (
                              <span className="text-xs text-gray-500">
                                +{hotel.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">{hotel.cancellationPolicy}</p>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(hotel.totalPrice)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {nights} night{nights > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(hotel.totalPrice / nights)}/night
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Hotel Summary */}
          {selectedHotel && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Selected Hotel</h4>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{selectedHotel.hotelName}</p>
                <p>{selectedHotel.roomType} • {nights} night{nights > 1 ? 's' : ''}</p>
                <p className="font-semibold text-green-700">
                  Total: {formatCurrency(selectedHotel.totalPrice)}
                </p>
              </div>
            </div>
          )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={!selectedHotel}
                >
                  Add Hotel to Quote
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}