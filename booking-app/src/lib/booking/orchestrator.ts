import { createAdminClient } from '@/lib/supabase/server';
import { getHotelBedsHeaders, getHotelBedsBaseUrl } from '@/lib/hotelbeds/auth';
import { TravelItem } from '@/types';

const getServiceClient = createAdminClient;

// Price tolerance: 2% or $2, whichever is greater
const PRICE_TOLERANCE_PERCENT = 0.02;
const PRICE_TOLERANCE_ABSOLUTE = 2;

function isPriceWithinTolerance(originalPrice: number, newPrice: number): boolean {
  const percentTolerance = originalPrice * PRICE_TOLERANCE_PERCENT;
  const tolerance = Math.max(percentTolerance, PRICE_TOLERANCE_ABSOLUTE);
  return Math.abs(newPrice - originalPrice) <= tolerance;
}

// =====================================================
// Main Entry Point
// =====================================================

export async function orchestrateBooking(
  bookingId: string,
  quoteId: string,
  userId: string
): Promise<void> {
  const supabase = await getServiceClient();

  console.log(`🎯 [Orchestrator] Starting orchestration for booking ${bookingId}`);

  // Idempotency: check orchestration_status
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, orchestration_status, quote_id, contact_id, payment_status')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    console.error('❌ [Orchestrator] Booking not found:', bookingError);
    return;
  }

  // Allow re-entry when payment status changes (e.g., partial → paid)
  if (booking.orchestration_status === 'completed') {
    console.log('⚡ [Orchestrator] Already completed, skipping');
    return;
  }

  const isPartialPayment = booking.payment_status === 'partial';

  // Mark as in_progress
  await supabase
    .from('bookings')
    .update({ orchestration_status: 'in_progress' })
    .eq('id', bookingId);

  // Fetch quote
  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quoteData) {
    console.error('❌ [Orchestrator] Quote not found:', quoteError);
    await supabase.from('bookings').update({ orchestration_status: 'failed' }).eq('id', bookingId);
    return;
  }

  const quote = quoteData as any;
  const items = (quote.items || []) as TravelItem[];

  // Fetch booking items
  const { data: bookingItems, error: biError } = await supabase
    .from('booking_items')
    .select('*')
    .eq('booking_id', bookingId);

  if (biError || !bookingItems) {
    console.error('❌ [Orchestrator] Failed to fetch booking items:', biError);
    await supabase.from('bookings').update({ orchestration_status: 'failed' }).eq('id', bookingId);
    return;
  }

  // Process each booking item
  for (const bookingItem of bookingItems) {
    // Skip terminal states
    if (bookingItem.booking_status && ['booked', 'cancelled'].includes(bookingItem.booking_status)) {
      console.log(`⏭️ [Orchestrator] Skipping ${bookingItem.name} - already ${bookingItem.booking_status}`);
      continue;
    }

    // Find matching quote item
    const quoteItem = items.find(
      (qi: TravelItem) => qi.id === bookingItem.quote_item_id || qi.name === bookingItem.name
    );

    // Refundability check: if partial payment, only process flights + non-refundable items
    if (isPartialPayment) {
      const isFlight = bookingItem.type === 'flight';
      const isNonRefundable = quoteItem?.cancellationPolicy?.nonRefundable === true;

      if (!isFlight && !isNonRefundable) {
        // Defer this refundable item until full payment
        if (bookingItem.booking_status !== 'awaiting_full_payment') {
          console.log(`⏸️ [Orchestrator] Deferring refundable item ${bookingItem.name} until full payment`);
          await updateBookingItemStatus(supabase, bookingItem.id, 'awaiting_full_payment');
          await createOrchestrationTask(supabase, 'awaiting_payment', bookingItem, quote, bookingId, userId,
            `${bookingItem.name} is refundable and will be booked after full payment is received. Current payment: deposit only.`,
            { reason: 'awaiting_full_payment', itemType: bookingItem.type }
          );
        }
        continue;
      }
    }

    try {
      await processItem(bookingItem, quoteItem, quote, bookingId, userId, supabase);
    } catch (error: any) {
      console.error(`❌ [Orchestrator] Error processing ${bookingItem.name}:`, error);
      await updateBookingItemStatus(supabase, bookingItem.id, 'failed', error.message);
      await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
        `Booking failed for ${bookingItem.name}: ${error.message}`,
        { error: error.message }
      );
    }
  }

  // Check overall status
  await checkAndUpdateOverallBookingStatus(supabase, bookingId, quoteId);

  console.log(`✅ [Orchestrator] Orchestration complete for booking ${bookingId}`);
}

// =====================================================
// Item Processing (branches by supplier type)
// =====================================================

async function processItem(
  bookingItem: any,
  quoteItem: TravelItem | undefined,
  quote: any,
  bookingId: string,
  userId: string,
  supabase: any
): Promise<void> {
  const supplierSource = bookingItem.supplier_source || quoteItem?.supplierSource || 'offline_agent';
  const isAPIHotel = supplierSource === 'api_hotelbeds' && bookingItem.type === 'hotel';
  const isAPIFlight = ['api_amadeus', 'api_sabre'].includes(supplierSource) && bookingItem.type === 'flight';

  if (isAPIHotel) {
    await processAPIHotel(bookingItem, quoteItem, quote, bookingId, userId, supabase);
  } else if (isAPIFlight) {
    await processAPIFlight(bookingItem, quoteItem, quote, bookingId, userId, supabase);
  } else {
    await processOfflineItem(bookingItem, quoteItem, quote, bookingId, userId, supabase);
  }

  // Create document collection task for all items
  await createOrchestrationTask(supabase, 'document_collection', bookingItem, quote, bookingId, userId,
    `Collect documents for ${bookingItem.name}`,
    { itemType: bookingItem.type }
  );
}

// =====================================================
// API Hotel Processing (CheckRate → Book or Flag)
// =====================================================

async function processAPIHotel(
  bookingItem: any,
  quoteItem: TravelItem | undefined,
  quote: any,
  bookingId: string,
  userId: string,
  supabase: any
): Promise<void> {
  console.log(`🏨 [Orchestrator] Processing API hotel: ${bookingItem.name}`);

  await updateBookingItemStatus(supabase, bookingItem.id, 'price_checking');

  const rateKey = bookingItem.details?.rateKey || quoteItem?.details?.rateKey;

  if (!rateKey) {
    console.warn(`⚠️ [Orchestrator] No rate key for ${bookingItem.name}, creating failed task`);
    await updateBookingItemStatus(supabase, bookingItem.id, 'failed', 'No rate key available');
    await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
      `No rate key available for ${bookingItem.name}. The rate may have expired.`,
      { error: 'no_rate_key' }
    );
    return;
  }

  // Call HotelBeds CheckRate API
  try {
    const baseUrl = getHotelBedsBaseUrl();
    const headers = getHotelBedsHeaders();

    const checkRateResponse = await fetch(`${baseUrl}/hotel-api/1.0/checkrates`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rooms: [{ rateKey }]
      }),
    });

    if (!checkRateResponse.ok) {
      const errorData = await checkRateResponse.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `CheckRate failed (${checkRateResponse.status})`;

      // Rate key likely expired
      console.error(`❌ [Orchestrator] CheckRate failed for ${bookingItem.name}:`, errorMsg);
      await updateBookingItemStatus(supabase, bookingItem.id, 'failed', errorMsg);
      await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
        `Rate expired or unavailable for ${bookingItem.name}. ${errorMsg}`,
        { error: 'rate_expired', rateKey }
      );
      return;
    }

    const checkRateData = await checkRateResponse.json();
    const hotel = checkRateData?.hotel;
    const room = hotel?.rooms?.[0];
    const rate = room?.rates?.[0];

    if (!rate) {
      await updateBookingItemStatus(supabase, bookingItem.id, 'failed', 'No rate returned from CheckRate');
      await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
        `CheckRate returned no rate for ${bookingItem.name}.`,
        { error: 'no_rate_returned' }
      );
      return;
    }

    const newPrice = parseFloat(rate.net || rate.sellingRate || '0');
    const newRateKey = rate.rateKey || rateKey;
    const originalPrice = bookingItem.supplier_cost || bookingItem.price;

    // Store checked price
    await supabase
      .from('booking_items')
      .update({
        last_checked_price: newPrice,
        price_check_rate_key: newRateKey,
      })
      .eq('id', bookingItem.id);

    // Compare prices
    if (isPriceWithinTolerance(originalPrice, newPrice)) {
      // Price is within tolerance — automatically book the hotel
      console.log(`✅ [Orchestrator] Price OK for ${bookingItem.name} ($${originalPrice} → $${newPrice}). Auto-booking...`);
      await autoBookHotel(bookingItem, quote, bookingId, userId, newRateKey, supabase);
    } else {
      // Price changed — flag for human review
      console.log(`⚠️ [Orchestrator] Price changed for ${bookingItem.name}: $${originalPrice} → $${newPrice}`);
      await updateBookingItemStatus(supabase, bookingItem.id, 'price_changed');
      await createOrchestrationTask(supabase, 'price_review', bookingItem, quote, bookingId, userId,
        `Price changed for ${bookingItem.name}: $${originalPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${((newPrice - originalPrice) / originalPrice * 100).toFixed(1)}% change)`,
        {
          taskType: 'price_review',
          originalPrice,
          newPrice,
          priceDiff: newPrice - originalPrice,
          percentChange: ((newPrice - originalPrice) / originalPrice * 100).toFixed(1),
          newRateKey,
          hotelName: hotel?.name || bookingItem.name,
        }
      );
    }
  } catch (error: any) {
    console.error(`❌ [Orchestrator] CheckRate exception for ${bookingItem.name}:`, error);
    await updateBookingItemStatus(supabase, bookingItem.id, 'failed', error.message);
    await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
      `CheckRate failed for ${bookingItem.name}: ${error.message}`,
      { error: error.message }
    );
  }
}

async function autoBookHotel(
  bookingItem: any,
  quote: any,
  bookingId: string,
  userId: string,
  rateKey: string,
  supabase: any
): Promise<void> {
  await updateBookingItemStatus(supabase, bookingItem.id, 'booking_in_progress');

  try {
    const baseUrl = getHotelBedsBaseUrl();
    const headers = getHotelBedsHeaders();

    const customerName = quote.customer_name || quote.customerName || 'Guest';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'Name';

    const bookingPayload = {
      holder: { name: firstName, surname: lastName },
      rooms: [{
        rateKey,
        paxes: [{ roomId: 1, type: 'AD', name: firstName, surname: lastName }],
      }],
      clientReference: `${quote.id}-${bookingItem.id}`,
      remark: `Auto-booked by orchestrator for booking ${bookingId}`,
      tolerance: 2.00,
    };

    const response = await fetch(`${baseUrl}/hotel-api/1.0/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ booking: bookingPayload }),
    });

    const data = await response.json();

    if (response.ok && data.booking) {
      const confirmationNumber = data.booking.reference;
      console.log(`✅ [Orchestrator] Hotel auto-booked: ${confirmationNumber}`);

      await supabase
        .from('booking_items')
        .update({
          booking_status: 'booked',
          confirmation_number: confirmationNumber,
          confirmed_at: new Date().toISOString(),
          orchestration_error: null,
        })
        .eq('id', bookingItem.id);

      // Update supplier expense
      await supabase
        .from('expenses')
        .update({ status: 'booked' })
        .eq('quote_id', quote.id)
        .eq('subcategory', bookingItem.type);

    } else {
      const errorMsg = data.error?.message || 'Booking API returned error';
      console.error(`❌ [Orchestrator] Hotel booking failed:`, errorMsg);
      await updateBookingItemStatus(supabase, bookingItem.id, 'failed', errorMsg);
      await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
        `Auto-booking failed for ${bookingItem.name}: ${errorMsg}`,
        { error: errorMsg, rateKey }
      );
    }
  } catch (error: any) {
    console.error(`❌ [Orchestrator] Hotel booking exception:`, error);
    await updateBookingItemStatus(supabase, bookingItem.id, 'failed', error.message);
    await createOrchestrationTask(supabase, 'booking_failed', bookingItem, quote, bookingId, userId,
      `Auto-booking exception for ${bookingItem.name}: ${error.message}`,
      { error: error.message }
    );
  }
}

// =====================================================
// API Flight Processing (requires passenger details)
// =====================================================

async function processAPIFlight(
  bookingItem: any,
  quoteItem: TravelItem | undefined,
  quote: any,
  bookingId: string,
  userId: string,
  supabase: any
): Promise<void> {
  console.log(`✈️ [Orchestrator] Processing API flight: ${bookingItem.name}`);

  await updateBookingItemStatus(supabase, bookingItem.id, 'awaiting_passenger_details');

  await createOrchestrationTask(supabase, 'passenger_details', bookingItem, quote, bookingId, userId,
    `Enter passenger details for ${bookingItem.name}. Passport names, DOB, and passport/ID numbers required before booking can proceed.`,
    {
      taskType: 'passenger_details',
      flightName: bookingItem.name,
      passengerCount: bookingItem.quantity || quoteItem?.quantity || 1,
      provider: bookingItem.supplier_source || quoteItem?.supplierSource,
    }
  );
}

// =====================================================
// Offline Item Processing
// =====================================================

async function processOfflineItem(
  bookingItem: any,
  quoteItem: TravelItem | undefined,
  quote: any,
  bookingId: string,
  userId: string,
  supabase: any
): Promise<void> {
  console.log(`📋 [Orchestrator] Processing offline item: ${bookingItem.name}`);

  await updateBookingItemStatus(supabase, bookingItem.id, 'awaiting_supplier');

  // Create manual booking task
  await createOrchestrationTask(supabase, 'manual_booking', bookingItem, quote, bookingId, userId,
    `Manually book ${bookingItem.name}. Contact supplier and confirm booking.`,
    {
      taskType: 'manual_booking',
      supplier: bookingItem.supplier || quoteItem?.supplier || 'Unknown',
      supplierSource: bookingItem.supplier_source || quoteItem?.supplierSource,
    }
  );

  // Create awaiting supplier task
  await createOrchestrationTask(supabase, 'awaiting_supplier', bookingItem, quote, bookingId, userId,
    `Waiting for supplier confirmation for ${bookingItem.name}. Follow up if no response within 24 hours.`,
    {
      taskType: 'awaiting_supplier',
      supplier: bookingItem.supplier || quoteItem?.supplier || 'Unknown',
    }
  );
}

// =====================================================
// Helpers
// =====================================================

async function updateBookingItemStatus(
  supabase: any,
  itemId: string,
  status: string,
  error?: string
): Promise<void> {
  const update: any = {
    booking_status: status,
    updated_at: new Date().toISOString(),
  };

  if (error) {
    update.orchestration_error = error;
  }

  await supabase
    .from('booking_items')
    .update(update)
    .eq('id', itemId);
}

async function createOrchestrationTask(
  supabase: any,
  taskType: string,
  bookingItem: any,
  quote: any,
  bookingId: string,
  userId: string,
  description: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  // Idempotency: check for existing task of same type for same booking item
  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('booking_item_id', bookingItem.id)
    .eq('type', taskType)
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existing) {
    console.log(`⚡ [Orchestrator] Task already exists for ${taskType} on item ${bookingItem.id}`);
    return existing.id;
  }

  const priority = ['booking_ready', 'price_review', 'booking_failed', 'passenger_details'].includes(taskType) ? 'high' : 'medium';
  const dueHours = taskType === 'booking_failed' ? 4 : taskType === 'price_review' ? 8 : 24;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      type: taskType,
      title: `${getTaskTitle(taskType)}: ${bookingItem.name}`,
      description,
      priority,
      status: 'pending',
      quote_id: quote.id,
      quote_item_id: bookingItem.quote_item_id,
      booking_id: bookingId,
      booking_item_id: bookingItem.id,
      contact_id: quote.contact_id || quote.contactId,
      customer_name: quote.customer_name || quote.customerName,
      item_type: bookingItem.type,
      item_name: bookingItem.name,
      item_details: bookingItem.details,
      due_date: new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString().split('T')[0],
      attachments: metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    console.error(`❌ [Orchestrator] Failed to create ${taskType} task:`, error);
    return null;
  }

  console.log(`📋 [Orchestrator] Created ${taskType} task: ${data.id}`);
  return data.id;
}

function getTaskTitle(taskType: string): string {
  const titles: Record<string, string> = {
    booking_ready: 'Review & Execute Booking',
    price_review: 'Price Review Required',
    booking_failed: 'Booking Failed',
    passenger_details: 'Enter Passenger Details',
    manual_booking: 'Manual Booking Required',
    awaiting_supplier: 'Awaiting Supplier Confirmation',
    document_collection: 'Collect Documents',
    awaiting_payment: 'Awaiting Full Payment',
  };
  return titles[taskType] || 'Booking Task';
}

export async function checkAndUpdateOverallBookingStatus(
  supabaseOrNull?: any,
  bookingId?: string,
  quoteId?: string
): Promise<void> {
  const supabase = supabaseOrNull || (await getServiceClient());

  if (!bookingId) return;

  const { data: items } = await supabase
    .from('booking_items')
    .select('booking_status')
    .eq('booking_id', bookingId);

  if (!items || items.length === 0) return;

  const statuses = items.map((i: any) => i.booking_status);
  const allBooked = statuses.every((s: string) => s === 'booked');
  const allTerminal = statuses.every((s: string) => ['booked', 'cancelled', 'failed'].includes(s));
  const anyFailed = statuses.some((s: string) => s === 'failed');
  const anyAwaitingPayment = statuses.some((s: string) => s === 'awaiting_full_payment');
  const allSettled = statuses.every((s: string) => ['booked', 'cancelled', 'failed', 'awaiting_full_payment'].includes(s));

  let orchestrationStatus = 'in_progress';
  let bookingStatus = 'pending';

  if (allBooked) {
    orchestrationStatus = 'completed';
    bookingStatus = 'booked';
  } else if (allSettled && anyAwaitingPayment) {
    // Some items are waiting for full payment — orchestration is paused, not failed
    orchestrationStatus = 'awaiting_payment';
    bookingStatus = 'confirmed';
  } else if (allTerminal) {
    orchestrationStatus = anyFailed ? 'partial' : 'completed';
    bookingStatus = anyFailed ? 'confirmed' : 'booked';
  }

  await supabase
    .from('bookings')
    .update({
      orchestration_status: orchestrationStatus,
      status: bookingStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // Also update quote status if all booked
  if (allBooked && quoteId) {
    await supabase
      .from('quotes')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    console.log(`🎊 [Orchestrator] All items booked! Booking ${bookingId} and quote ${quoteId} set to 'booked'`);
  }
}
