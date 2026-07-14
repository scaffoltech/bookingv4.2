'use client';

import { useState, useMemo, useCallback, useEffect, memo, useRef } from 'react';
import { Calendar, momentLocalizer, View, SlotInfo, ToolbarProps } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { TravelQuote, TravelItem, CalendarEvent } from '@/types';
import { useQuoteStore } from '@/store/quote-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, getTravelItemColor } from '@/lib/utils';
import { Plane, Hotel, MapPin, Car, Calendar as CalendarIcon } from 'lucide-react';
import { FlightBuilder } from '@/components/item-builders/FlightBuilder';
import { HotelBuilder } from '@/components/item-builders/HotelBuilder';
import { ActivityBuilder } from '@/components/item-builders/ActivityBuilder';
import { TransferBuilder } from '@/components/item-builders/TransferBuilder';
import { EditItemModal } from '@/components/item-editors/EditItemModal';
import { QuickEditPopover } from '@/components/item-editors/QuickEditPopover';
import { TravelListView } from './TravelListView';
import { FilterControls } from './FilterControls';
import { TimelineNavigation } from './TimelineNavigation';
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu';
import { Badge } from '@/components/ui/badge';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface TravelItemsProps {
  quote: TravelQuote;
  onComplete: () => void;
}

export function TravelItems({ quote, onComplete }: TravelItemsProps) {
  const { addItemToQuote, removeItemFromQuote, updateItemInQuote } = useQuoteStore();
  const [view, setView] = useState<View>('month'); // Default to month view for better overview
  const [date, setDate] = useState(new Date(quote.travelDates.start));
  const [showFlightBuilder, setShowFlightBuilder] = useState(false);
  const [showHotelBuilder, setShowHotelBuilder] = useState(false);
  const [showActivityBuilder, setShowActivityBuilder] = useState(false);
  const [showTransferBuilder, setShowTransferBuilder] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filteredItems, setFilteredItems] = useState<TravelItem[]>([]);
  
  // Edit functionality
  const [editingItem, setEditingItem] = useState<TravelItem | null>(null);
  const [quickEditItem, setQuickEditItem] = useState<TravelItem | null>(null);
  const [quickEditPosition, setQuickEditPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    slotInfo: SlotInfo | null;
  }>({
    x: 0,
    y: 0,
    isOpen: false,
    slotInfo: null,
  });

  // Ref to store last click coordinates for context menu positioning
  const lastClickPosition = useRef({ x: 0, y: 0 });

  const currentQuote = useQuoteStore(state => 
    state.quotes.find(q => q.id === quote.id)
  ) || quote;

  // Use filtered items if available, otherwise use all items
  const displayItems = filteredItems.length > 0 || currentQuote.items.length === 0 ? filteredItems : currentQuote.items;

  // Calculate dynamic calendar height based on viewport and responsive breakpoints
  const calculateCalendarHeight = useMemo(() => {
    if (typeof window === 'undefined') return 700; // SSR fallback
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Responsive breakpoints with different height strategies
    let baseHeight: number;
    let maxHeight: number;
    let viewportPercentage: number;
    
    if (viewportWidth >= 1280) {
      // Desktop - Large calendar
      baseHeight = 700;
      maxHeight = 1200;
      viewportPercentage = 0.85;
    } else if (viewportWidth >= 768) {
      // Tablet - Medium calendar
      baseHeight = 600;
      maxHeight = 900;
      viewportPercentage = 0.8;
    } else {
      // Mobile - Compact calendar
      baseHeight = 500;
      maxHeight = 600;
      viewportPercentage = 0.75;
    }
    
    // Use viewport height as primary constraint
    const viewportBasedHeight = viewportHeight * viewportPercentage;
    
    // Item density adjustment (minimal impact)
    const itemCount = currentQuote.items.length;
    const itemAdjustment = Math.min(itemCount * 15, 100); // Max 100px adjustment
    
    const calculatedHeight = Math.min(
      maxHeight,
      Math.max(baseHeight, viewportBasedHeight + itemAdjustment)
    );
    
    return Math.floor(calculatedHeight);
  }, [currentQuote.items.length]);

  // Detect overlapping events for smart positioning
  const detectOverlappingEvents = useCallback((events: CalendarEvent[]) => {
    const overlaps = new Map<string, number>();
    
    events.forEach((event, index) => {
      let overlapCount = 0;
      events.forEach((otherEvent, otherIndex) => {
        if (index !== otherIndex) {
          const eventStart = event.start.getTime();
          const eventEnd = event.end.getTime();
          const otherStart = otherEvent.start.getTime();
          const otherEnd = otherEvent.end.getTime();
          
          // Check for overlap
          if ((eventStart < otherEnd && eventEnd > otherStart)) {
            overlapCount++;
          }
        }
      });
      overlaps.set(event.id, overlapCount);
    });
    
    return overlaps;
  }, []);

  // Ensure calendar is focused on travel dates
  useEffect(() => {
    const travelStartDate = new Date(quote.travelDates.start);
    if (date.getTime() !== travelStartDate.getTime()) {
      setDate(travelStartDate);
    }
  }, [quote.travelDates.start]);

  // Convert travel items to calendar events (using filtered items)
  const events = useMemo(() => {
    return displayItems.map(item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate || item.startDate);
      
      // Add default times based on item type if no time is specified
      if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
        switch (item.type) {
          case 'flight':
            startDate.setHours(8, 0); // 8:00 AM
            endDate.setHours(10, 0);  // 10:00 AM
            break;
          case 'hotel':
            startDate.setHours(15, 0); // 3:00 PM check-in
            endDate.setHours(11, 0);   // 11:00 AM check-out (next day)
            break;
          case 'activity':
            startDate.setHours(10, 0); // 10:00 AM
            endDate.setHours(12, 0);   // 12:00 PM
            break;
          case 'transfer':
            startDate.setHours(9, 0);  // 9:00 AM
            endDate.setHours(10, 0);   // 10:00 AM
            break;
          default:
            startDate.setHours(9, 0);
            endDate.setHours(10, 0);
        }
      }
      
      return {
        id: item.id,
        title: item.name,
        start: startDate,
        end: endDate,
        resource: {
          type: item.type,
          contactId: quote.contactId,
          quoteId: quote.id,
          details: { ...item.details, price: item.price, quantity: item.quantity },
        },
      };
    }) as CalendarEvent[];
  }, [displayItems, quote.contactId, quote.id]);

  // Handle slot selection (clicking empty calendar space)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo, e?: React.SyntheticEvent) => {
    // Use stored click coordinates from the wrapper div
    const { x, y } = lastClickPosition.current;
    
    // Show context menu at the stored click position
    setContextMenu({
      x,
      y,
      isOpen: true,
      slotInfo,
    });
  }, []);

  // Handle event selection (clicking existing event)
  const handleSelectEvent = useCallback((event: CalendarEvent, e: React.SyntheticEvent) => {
    const item = currentQuote.items.find(item => item.id === event.id);
    if (!item) return;

    // Get click position for popover - use the actual mouse event if available
    const mouseEvent = e.nativeEvent as MouseEvent;
    const position = {
      x: mouseEvent.clientX || mouseEvent.pageX || window.innerWidth / 2,
      y: mouseEvent.clientY || mouseEvent.pageY || 100,
    };

    setQuickEditItem(item);
    setQuickEditPosition(position);
  }, [currentQuote.items]);

  // Handle event drag and drop with debouncing for better performance
  const handleEventDrop = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    const item = currentQuote.items.find(item => item.id === event.id);
    if (item) {
      // Preserve the original time when moving dates
      const originalStart = new Date(item.startDate);
      const originalEnd = item.endDate ? new Date(item.endDate) : null;
      
      // Calculate the time difference
      const timeDiff = end.getTime() - start.getTime();
      
      // Apply the same time to the new date
      const newStart = new Date(start);
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
      
      const newEnd = originalEnd ? new Date(newStart.getTime() + timeDiff) : undefined;
      
      updateItemInQuote(quote.id, event.id, {
        startDate: newStart.toISOString(),
        endDate: newEnd ? newEnd.toISOString() : undefined,
      });
      
      // Show a brief confirmation
      const itemName = item.name;
      const newDate = newStart.toLocaleDateString();
      const newTime = newStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // You could add a toast notification here
      // Batched update for better performance
      console.log(`${itemName} moved to ${newDate} at ${newTime}`);
    }
  }, [currentQuote.items, quote.id, updateItemInQuote]);

  // Handle event resize
  const handleEventResize = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    const item = currentQuote.items.find(item => item.id === event.id);
    if (item) {
      updateItemInQuote(quote.id, event.id, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      
      // Show resize confirmation
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
      console.log(`${item.name} duration changed to ${duration} minutes`);
    }
  }, [currentQuote.items, quote.id, updateItemInQuote]);

  // Enhanced event styling with smart positioning
  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = event.resource 
      ? getTravelItemColor(event.resource.type)
      : '#6B7280';
    
    // Get overlap information for this event
    const overlaps = detectOverlappingEvents(events);
    const overlapCount = overlaps.get(event.id) || 0;
    const horizontalOffset = Math.min(overlapCount * 10, 30); // Max 30px offset
    
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.95,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        padding: '4px 8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: `${horizontalOffset}px 2px 8px rgba(0,0,0,0.15)`,
        transform: overlapCount > 0 ? `translateX(${horizontalOffset}px)` : 'none',
        zIndex: overlapCount > 0 ? 10 + overlapCount : 'auto',
      },
    };
  };

  // Add new travel item
  const handleAddItem = (itemData: Omit<TravelItem, 'id'>) => {
    addItemToQuote(quote.id, itemData);
  };

  // Handle quick edit save
  const handleQuickEditSave = (updates: Partial<TravelItem>) => {
    if (!quickEditItem) return;
    updateItemInQuote(quote.id, quickEditItem.id, updates);
    setQuickEditItem(null);
    setQuickEditPosition(null);
  };

  // Handle full edit save
  const handleFullEditSave = (updates: Partial<TravelItem>) => {
    if (!editingItem) return;
    updateItemInQuote(quote.id, editingItem.id, updates);
    setEditingItem(null);
  };

  // Handle item deletion
  const handleDeleteItem = () => {
    if (!editingItem) return;
    removeItemFromQuote(quote.id, editingItem.id);
    setEditingItem(null);
  };

  // Handle context menu item selection
  const handleContextMenuItemSelect = (itemType: 'flight' | 'hotel' | 'activity' | 'transfer') => {
    const { slotInfo } = contextMenu;
    if (!slotInfo) return;

    // Close context menu
    setContextMenu(prev => ({ ...prev, isOpen: false }));

    // Open appropriate modal based on item type
    switch (itemType) {
      case 'flight':
        setShowFlightBuilder(true);
        break;
      case 'hotel':
        setShowHotelBuilder(true);
        break;
      case 'activity':
        setShowActivityBuilder(true);
        break;
      case 'transfer':
        setShowTransferBuilder(true);
        break;
    }
  };

  // Simplified Custom Toolbar (only calendar navigation)
  const CustomToolbar = (toolbar: ToolbarProps) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      let displayText;
      
      switch (toolbar.view) {
        case 'month':
          displayText = date.format('MMMM YYYY');
          break;
        case 'week':
          const weekStart = moment(date).startOf('week');
          const weekEnd = moment(date).endOf('week');
          displayText = `${weekStart.format('MMM D')}-${weekEnd.format('D, YYYY')}`;
          break;
        case 'day':
          displayText = date.format('dddd, MMM D, YYYY');
          break;
        default:
          displayText = date.format('MMMM YYYY');
      }
      
      return (
        <span className="text-lg font-semibold text-gray-900">
          {displayText}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToBack}
            className="px-3 py-1.5 bg-white border rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            ←
          </button>
          <button
            onClick={goToCurrent}
            className="px-3 py-1.5 bg-white border rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-1.5 bg-white border rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            →
          </button>
        </div>

        <div>{label()}</div>

        {/* Spacer for balanced layout */}
        <div className="w-20"></div>
      </div>
    );
  };

  // Custom Event Component (based on TimelineCalendar)
  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="flex items-center space-x-2">
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ 
          backgroundColor: event.resource 
            ? getTravelItemColor(event.resource.type) 
            : '#6B7280' 
        }}
      />
      <span className="truncate text-xs">{event.title}</span>
    </div>
  );

  // Enhanced event component with overlap indicator (memoized for performance)
  const EventComponent = memo<{ event: CalendarEvent }>(function EventComponent({ event }) {
    const item = currentQuote.items.find(item => item.id === event.id);
    if (!item) return <div>{event.title}</div>;
    
    const overlaps = detectOverlappingEvents(events);
    const overlapCount = overlaps.get(event.id) || 0;
    
    return (
      <div className="relative group h-full">
        <div className="flex items-center justify-between h-full p-1">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-white opacity-80 flex-shrink-0" />
            <div className="truncate text-xs font-medium">{event.title}</div>
          </div>
          <div className="text-xs font-semibold text-white opacity-75 ml-1 flex-shrink-0">
            {formatCurrency(item.price * item.quantity)}
          </div>
          {overlapCount > 2 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              +{overlapCount - 1}
            </div>
          )}
        </div>
        
        {/* Hover overlay with edit hint */}
        <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
            Click to edit
          </span>
        </div>
        
        {/* Enhanced resize handles for better interaction */}
        <div className="absolute top-0 left-0 w-2 h-full bg-white opacity-0 group-hover:opacity-60 cursor-ew-resize rounded-l" />
        <div className="absolute top-0 right-0 w-2 h-full bg-white opacity-0 group-hover:opacity-60 cursor-ew-resize rounded-r" />
      </div>
    );
  });

  // Floating action buttons for quick add
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Hotel className="w-4 h-4" />;
      case 'activity': return <MapPin className="w-4 h-4" />;
      case 'transfer': return <Car className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Travel Timeline
          </h2>
          <p className="text-gray-600">
            <span className="font-medium">Interactive Calendar:</span> Click empty space to choose item type • Drag to move • Resize to adjust duration • Click items to edit
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {moment(quote.travelDates.start).format('MMM D')} - {moment(quote.travelDates.end).format('MMM D, YYYY')}
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <FilterControls
        items={currentQuote.items}
        onFilterChange={setFilteredItems}
        className="mb-4"
      />

      {/* Quick Add Buttons */}
      <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg border mb-4">
        <span className="text-sm font-medium text-gray-700">Quick Add:</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowFlightBuilder(true)}
          className="flex items-center space-x-1"
        >
          <Plane className="w-4 h-4" />
          <span>Flight</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowHotelBuilder(true)}
          className="flex items-center space-x-1"
        >
          <Hotel className="w-4 h-4" />
          <span>Hotel</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowActivityBuilder(true)}
          className="flex items-center space-x-1"
        >
          <MapPin className="w-4 h-4" />
          <span>Activity</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowTransferBuilder(true)}
          className="flex items-center space-x-1"
        >
          <Car className="w-4 h-4" />
          <span>Transfer</span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Persistent Navigation */}
          <TimelineNavigation
            viewMode={viewMode}
            calendarView={view}
            onViewModeChange={setViewMode}
            onCalendarViewChange={setView}
          />

          {/* Timeline Content */}
          {viewMode === 'calendar' ? (
            <div className="p-4">
              <div 
                onMouseDown={(e) => {
                  // Store click coordinates for context menu positioning
                  lastClickPosition.current = { x: e.clientX, y: e.clientY };
                }}
              >
                <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: calculateCalendarHeight }}
                view={view}
                date={date}
                onView={(view) => setView(view)}
                onNavigate={(date) => setDate(date)}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                selectable
                resizable
                eventPropGetter={eventStyleGetter}
                components={{
                  event: EventComponent,
                  toolbar: CustomToolbar,
                }}
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
                step={60}
                showMultiDayTimes
                className="bg-white rounded-lg"
                tooltipAccessor={(event: CalendarEvent) => {
                  const item = currentQuote.items.find(item => item.id === event.id);
                  if (!item) return event.title;
                  return `${event.title}\n${formatCurrency(item.price * item.quantity)}\nClick to edit • Drag to move`;
                }}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              <TravelListView
                quote={quote}
                onEditItem={(item) => setEditingItem(item)}
                onDeleteItem={(itemId) => {
                  if (confirm('Remove this item?')) {
                    removeItemFromQuote(quote.id, itemId);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Summary Bar */}
      {currentQuote.items.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="text-sm px-2.5 py-1">
                {currentQuote.items.length} item{currentQuote.items.length !== 1 ? 's' : ''}
              </Badge>
              <span className="text-gray-600 text-sm">added to quote</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right space-y-1">
                <div className="flex items-center justify-end space-x-3 text-xs text-gray-500">
                  <span>Cost: {formatCurrency(currentQuote.items.reduce((sum, item) => sum + (item.supplierCost || item.price * 0.80), 0))}</span>
                  <span className="text-green-600">
                    +Markup: {formatCurrency(currentQuote.items.reduce((sum, item) => {
                      const supplierCost = item.supplierCost || item.price * 0.80;
                      return sum + (item.price - supplierCost);
                    }, 0))}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Client Total</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(currentQuote.totalCost)}
                </div>
              </div>
              <Button onClick={onComplete} className="min-w-[140px]">
                Continue to Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding to prevent content overlap */}
      {currentQuote.items.length > 0 && <div className="h-20" />}

      {/* Flight Builder Modal */}
      {showFlightBuilder && (
        <FlightBuilder
          onSubmit={(flightData) => {
            handleAddItem(flightData);
            setShowFlightBuilder(false);
          }}
          onCancel={() => setShowFlightBuilder(false)}
          tripStartDate={new Date(quote.travelDates.start)}
          tripEndDate={new Date(quote.travelDates.end)}
        />
      )}

      {/* Hotel Builder Modal */}
      {showHotelBuilder && (
        <HotelBuilder
          onSubmit={(hotelData) => {
            handleAddItem(hotelData);
            setShowHotelBuilder(false);
          }}
          onCancel={() => setShowHotelBuilder(false)}
          tripStartDate={new Date(quote.travelDates.start)}
          tripEndDate={new Date(quote.travelDates.end)}
        />
      )}

      {/* Activity Builder Modal */}
      {showActivityBuilder && (
        <ActivityBuilder
          onSubmit={(activityData) => {
            handleAddItem(activityData);
            setShowActivityBuilder(false);
          }}
          onCancel={() => setShowActivityBuilder(false)}
          tripStartDate={new Date(quote.travelDates.start)}
          tripEndDate={new Date(quote.travelDates.end)}
        />
      )}

      {/* Transfer Builder Modal */}
      {showTransferBuilder && (
        <TransferBuilder
          onSubmit={(transferData) => {
            handleAddItem(transferData);
            setShowTransferBuilder(false);
          }}
          onCancel={() => setShowTransferBuilder(false)}
          tripStartDate={new Date(quote.travelDates.start)}
          tripEndDate={new Date(quote.travelDates.end)}
        />
      )}

      {/* Quick Edit Popover */}
      {quickEditItem && quickEditPosition && (
        <QuickEditPopover
          item={quickEditItem}
          position={quickEditPosition}
          onSave={handleQuickEditSave}
          onCancel={() => {
            setQuickEditItem(null);
            setQuickEditPosition(null);
          }}
          onFullEdit={() => {
            setEditingItem(quickEditItem);
            setQuickEditItem(null);
            setQuickEditPosition(null);
          }}
        />
      )}

      {/* Full Edit Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={handleFullEditSave}
          onDelete={handleDeleteItem}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      >
        <ContextMenuItem
          icon={<Plane className="w-4 h-4 text-blue-600" />}
          onClick={() => handleContextMenuItemSelect('flight')}
        >
          Add Flight
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Hotel className="w-4 h-4 text-green-600" />}
          onClick={() => handleContextMenuItemSelect('hotel')}
        >
          Add Hotel
        </ContextMenuItem>
        <ContextMenuItem
          icon={<MapPin className="w-4 h-4 text-orange-600" />}
          onClick={() => handleContextMenuItemSelect('activity')}
        >
          Add Activity
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Car className="w-4 h-4 text-purple-600" />}
          onClick={() => handleContextMenuItemSelect('transfer')}
        >
          Add Transfer
        </ContextMenuItem>
      </ContextMenu>
    </div>
  );
}