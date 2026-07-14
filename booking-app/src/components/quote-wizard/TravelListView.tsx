'use client';

import { useState, useMemo } from 'react';
import { TravelQuote, TravelItem } from '@/types';
import { useQuoteStore } from '@/store/quote-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getTravelItemColor } from '@/lib/utils';
import { 
  Plane, 
  Hotel, 
  MapPin, 
  Car, 
  ChevronDown, 
  ChevronRight,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  Clock,
  DollarSign,
  GripVertical,
} from 'lucide-react';
import moment from 'moment';

interface TravelListViewProps {
  quote: TravelQuote;
  onEditItem: (item: TravelItem) => void;
  onDeleteItem: (itemId: string) => void;
}

interface GroupedItems {
  [date: string]: TravelItem[];
}

export function TravelListView({ quote, onEditItem, onDeleteItem }: TravelListViewProps) {
  const { updateItemInQuote } = useQuoteStore();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(true);

  const currentQuote = useQuoteStore(state => 
    state.quotes.find(q => q.id === quote.id)
  ) || quote;

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: GroupedItems = {};
    
    currentQuote.items.forEach(item => {
      const dateKey = moment(item.startDate).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    // Sort items within each day by time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    });

    return groups;
  }, [currentQuote.items]);

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort();
  }, [groupedItems]);

  // Initialize expanded state
  useMemo(() => {
    if (expandAll && expandedDays.size === 0) {
      setExpandedDays(new Set(sortedDates));
    }
  }, [sortedDates, expandAll, expandedDays.size]);

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const toggleAllDays = () => {
    if (expandAll) {
      setExpandedDays(new Set());
      setExpandAll(false);
    } else {
      setExpandedDays(new Set(sortedDates));
      setExpandAll(true);
    }
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

  const duplicateItem = (item: TravelItem) => {
    const newItem: Omit<TravelItem, 'id'> = {
      ...item,
      name: `${item.name} (Copy)`,
    };
    useQuoteStore.getState().addItemToQuote(quote.id, newItem);
  };

  const calculateDayTotal = (items: TravelItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Timeline List View
          </h3>
          <Badge variant="secondary">
            {currentQuote.items.length} items
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllDays}
          className="flex items-center space-x-1"
        >
          {expandAll ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Collapse All</span>
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              <span>Expand All</span>
            </>
          )}
        </Button>
      </div>

      {/* Day Groups */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No items added yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add flights, hotels, and activities to build your itinerary
            </p>
          </div>
        ) : (
          sortedDates.map(date => {
            const items = groupedItems[date];
            const isExpanded = expandedDays.has(date);
            const dayTotal = calculateDayTotal(items);
            const dayOfWeek = moment(date).format('dddd');
            const formattedDate = moment(date).format('MMMM D, YYYY');

            return (
              <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(date)}
                  className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">
                        {dayOfWeek}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formattedDate}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Day Total</div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(dayTotal)}
                    </div>
                  </div>
                </button>

                {/* Day Items */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            {/* Drag Handle */}
                            <div className="pt-1 cursor-move opacity-30 hover:opacity-60">
                              <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Item Icon */}
                            <div 
                              className="p-2 rounded-lg"
                              style={{ 
                                backgroundColor: `${getTravelItemColor(item.type)}20`,
                                color: getTravelItemColor(item.type)
                              }}
                            >
                              {getItemIcon(item.type)}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {item.name}
                                  </h4>
                                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {moment(item.startDate).format('h:mm A')}
                                        {item.endDate && item.endDate !== item.startDate && (
                                          <> - {moment(item.endDate).format('h:mm A')}</>
                                        )}
                                      </span>
                                    </div>
                                    {item.quantity > 1 && (
                                      <span className="text-gray-500">
                                        Qty: {item.quantity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {formatCurrency(item.price * item.quantity)}
                                  </div>
                                  {item.quantity > 1 && (
                                    <div className="text-sm text-gray-500">
                                      {formatCurrency(item.price)} each
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Item Metadata */}
                              {item.details && Object.keys(item.details).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(item.details).slice(0, 3).map(([key, value]) => (
                                    <Badge
                                      key={key}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {key.replace(/_/g, ' ')}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onEditItem(item)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Edit2 className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => duplicateItem(item)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Copy className="w-4 h-4 mr-1" />
                                  Duplicate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}