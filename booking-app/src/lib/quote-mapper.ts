import { TravelItem, TravelQuote } from '@/types';
import { calculateQuoteTotal } from '@/lib/utils';

/**
 * Shared utility to convert a database row to a TravelQuote object.
 * Used by query hooks, Zustand stores, and API routes.
 */
export function dbRowToQuote(row: any): TravelQuote {
  let items: TravelItem[] = [];

  if (Array.isArray(row.items)) {
    items = row.items as TravelItem[];
  } else if (typeof row.items === 'string') {
    try {
      const parsed = JSON.parse(row.items);
      if (Array.isArray(parsed)) {
        items = parsed as TravelItem[];
      }
    } catch {
      // Invalid JSON - use empty array
    }
  } else if (row.items && typeof row.items === 'object') {
    try {
      const maybeArray = Array.from(row.items as Iterable<TravelItem>);
      if (Array.isArray(maybeArray)) {
        items = maybeArray;
      }
    } catch {
      const values = Object.values(row.items as Record<string, TravelItem>);
      if (Array.isArray(values)) {
        items = values;
      }
    }
  }

  if (!Array.isArray(items)) {
    items = [];
  }

  // Guarantee each item has essential defaults
  items = items.map((item: TravelItem) => ({
    ...item,
    quantity: typeof item?.quantity === 'number' && !Number.isNaN(item.quantity) ? item.quantity : 1,
    details: item?.details && typeof item.details === 'object' ? item.details : {},
  }));

  // Resolve contact info from joined relations or flat columns
  const contactRecord = row.contact || row.contacts || row.contact_details || null;
  const contactId = row.contact_id || contactRecord?.id || null;
  const customerId = contactId || row.customer_id || null;

  const customerNameRaw = contactRecord
    ? `${contactRecord.first_name ?? ''} ${contactRecord.last_name ?? ''}`.trim()
    : (row.customer_name ?? row.contact_name ?? '');

  const customerEmail = contactRecord?.email ?? row.customer_email ?? null;
  const normalizedCustomerName =
    customerNameRaw && customerNameRaw.trim().length > 0
      ? customerNameRaw.trim()
      : customerEmail || 'Unnamed Contact';

  // Calculate total from items if total_amount is null/undefined, otherwise use database value
  const totalCost = row.total_amount != null
    ? parseFloat(row.total_amount)
    : calculateQuoteTotal(items);

  return {
    id: row.id,
    contactId: contactId ?? customerId ?? 'unknown-contact',
    customerId: customerId ?? contactId ?? 'unknown-contact',
    customerName: normalizedCustomerName,
    title: row.title,
    status: row.status as TravelQuote['status'],
    totalCost,
    items,
    paymentStatus: row.payment_status as TravelQuote['paymentStatus'],
    totalPaid: row.total_paid ? parseFloat(row.total_paid) : 0,
    remainingBalance: row.remaining_balance != null ? parseFloat(row.remaining_balance) : totalCost,
    travelDates: row.travel_start_date && row.travel_end_date
      ? {
          start: new Date(row.travel_start_date),
          end: new Date(row.travel_end_date),
        }
      : items.length > 0
      ? {
          start: new Date(items[0].startDate || row.created_at),
          end: new Date(items[items.length - 1].endDate || row.created_at),
        }
      : {
          start: new Date(),
          end: new Date(),
        },
    createdAt: new Date(row.created_at),
    ...(row.version != null && { version: row.version }),
  };
}
