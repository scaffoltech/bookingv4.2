'use client';

import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { useState, useMemo, useEffect } from 'react';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { CalendarEvent, TravelQuote } from '@/types';
import { getTravelItemColor } from '@/lib/utils';
import { downloadICSFile } from '@/lib/calendar-export';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CalendarPlus, Filter } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface TimelineCalendarProps {
  contactId?: string | null;
  statusFilters?: TravelQuote['status'][];
  height?: number;
  onEventCountChange?: (count: number) => void;
}

export function TimelineCalendar({
  contactId,
  statusFilters,
  height = 600,
  onEventCountChange
}: TimelineCalendarProps) {
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const { getCalendarEvents, quotes } = useQuoteCompat();

  const events = useMemo(() => {
    const rawEvents = getCalendarEvents(contactId || undefined, statusFilters);

    // Ensure dates are proper Date objects (fix for persisted storage serialization)
    return rawEvents.map(event => ({
      ...event,
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end),
    }));
  }, [getCalendarEvents, contactId, statusFilters]);

  // Notify parent of event count changes
  useEffect(() => {
    if (onEventCountChange) {
      onEventCountChange(events.length);
    }
  }, [events.length, onEventCountChange]);

  const handleExportAll = () => {
    // Create a consolidated quote with all travel items for export
    let filteredQuotes = quotes;

    if (contactId) {
      filteredQuotes = filteredQuotes.filter(quote => quote.contactId === contactId);
    }

    if (statusFilters && statusFilters.length > 0) {
      filteredQuotes = filteredQuotes.filter(quote => statusFilters.includes(quote.status));
    }
    
    if (filteredQuotes.length === 0) return;
    
    // Create a master quote with all items
    const allItems = filteredQuotes.flatMap(quote => quote.items);
    const consolidatedQuote = {
      id: 'consolidated-travel-calendar',
      title: contactId ? 'My Travel Calendar' : 'All Travel Bookings',
      items: allItems,
      totalCost: allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      contactId: contactId || 'all',
      status: 'sent' as const,
      travelDates: {
        start: allItems.length > 0 ? new Date(Math.min(...allItems.map(item => new Date(item.startDate).getTime()))) : new Date(),
        end: allItems.length > 0 ? new Date(Math.max(...allItems.map(item => new Date(item.endDate || item.startDate).getTime()))) : new Date(),
      },
      createdAt: new Date(),
    };
    
    downloadICSFile(consolidatedQuote);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = event.resource 
      ? getTravelItemColor(event.resource.type)
      : '#6B7280';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 6px',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const details = event.resource?.details as Record<string, unknown> | undefined;
    const isApiItem = details?.source === 'api';
    const apiProvider = details?.apiProvider;

    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: event.resource
                ? getTravelItemColor(event.resource.type)
                : '#6B7280'
            }}
          />
          {isApiItem && (
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-blue-400"
              title={`API sourced from ${apiProvider || 'external provider'}`}
            />
          )}
        </div>
        <span className="truncate text-xs">{event.title}</span>
        {isApiItem && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 uppercase">
            API
          </Badge>
        )}
      </div>
    );
  };

  const CustomToolbar = (toolbar: any) => {
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
      return (
        <span className="text-lg font-semibold">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToBack}
              className="px-3 py-1 bg-white border rounded-md hover:bg-gray-50"
            >
              ←
            </button>
            <button
              onClick={goToCurrent}
              className="px-3 py-1 bg-white border rounded-md hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="px-3 py-1 bg-white border rounded-md hover:bg-gray-50"
            >
              →
            </button>
          </div>

          <div>{label()}</div>

          <div className="flex items-center space-x-1">
            {['month', 'week', 'day', 'agenda'].map((viewName) => (
              <button
                key={viewName}
                onClick={() => toolbar.onView(viewName)}
                className={`px-3 py-1 rounded-md text-sm capitalize ${
                  toolbar.view === viewName
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {viewName}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            Export your travel calendar to use with Google Calendar, Apple Calendar, or Outlook
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              <Download className="w-4 h-4 mr-1" />
              Export All (.ics)
            </Button>
            <Button
              variant="outline"  
              size="sm"
              onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Travel Schedule')}&details=${encodeURIComponent('Your travel bookings and itinerary')}`, '_blank')}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              <CalendarPlus className="w-4 h-4 mr-1" />
              Add to Google Calendar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items match your filters</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters to see more travel items
          </p>
        </div>
      ) : (
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height }}
          view={view}
          date={date}
          onView={(view) => setView(view)}
          onNavigate={(date) => setDate(date)}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
            toolbar: CustomToolbar,
          }}
          views={['month', 'week', 'day', 'agenda']}
          step={60}
          showMultiDayTimes
          defaultView="week"
          className="bg-white rounded-lg shadow-sm"
        />
      )}
    </div>
  );
}