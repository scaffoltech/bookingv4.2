import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { getHotelBedsHeaders, getHotelBedsBaseUrl } from '@/lib/hotelbeds/auth';
import { checkAndUpdateOverallBookingStatus } from '@/lib/booking/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, action, confirmationNumber, notes, passengerDetails } = body;

    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch task with booking item
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify caller belongs to the org that owns this task's quote.
    if (task.quote_id) {
      const { data: quoteOwner } = await supabase.from('quotes').select('org_id').eq('id', task.quote_id).single();
      if (quoteOwner?.org_id) {
        const { data: membership } = await supabase
          .from('org_memberships')
          .select('id')
          .eq('org_id', quoteOwner.org_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (!membership) {
          return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
        }
      }
    }

    const bookingItemId = task.booking_item_id;
    const bookingId = task.booking_id;
    const quoteId = task.quote_id;

    // Fetch booking item if linked
    let bookingItem: any = null;
    if (bookingItemId) {
      const { data } = await supabase
        .from('booking_items')
        .select('*')
        .eq('id', bookingItemId)
        .single();
      bookingItem = data;
    }

    let result: any = { success: false };

    switch (action) {
      case 'approve_price':
        result = await handleApprovePrice(supabase, task, bookingItem);
        break;
      case 'reject_price':
        result = await handleRejectPrice(supabase, task, bookingItem);
        break;
      case 'retry_booking':
        result = await handleRetryBooking(supabase, task, bookingItem);
        break;
      case 'submit_passenger_details':
        result = await handleSubmitPassengerDetails(supabase, task, bookingItem, passengerDetails);
        break;
      case 'mark_booked':
        result = await handleMarkBooked(supabase, task, bookingItem, confirmationNumber, notes);
        break;
      case 'mark_failed':
        result = await handleMarkFailed(supabase, task, bookingItem, notes);
        break;
      case 'supplier_confirmed':
        result = await handleSupplierConfirmed(supabase, task, bookingItem, confirmationNumber, notes);
        break;
      case 'approve_booking':
        result = await handleApproveBooking(supabase, task, bookingItem);
        break;
      case 'reject_booking':
        result = await handleRejectPrice(supabase, task, bookingItem);
        break;
      case 'escalate':
        result = await handleEscalate(supabase, task, bookingItem, notes);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // After every action, check overall booking status
    if (bookingId) {
      await checkAndUpdateOverallBookingStatus(supabase, bookingId, quoteId ?? undefined);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Orchestrate Action] Error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}

// =====================================================
// Action Handlers
// =====================================================

async function handleApprovePrice(supabase: any, task: any, bookingItem: any) {
  if (!bookingItem) return { success: false, error: 'No booking item linked' };

  const attachments = task.attachments || {};
  const newRateKey = attachments.newRateKey || bookingItem.price_check_rate_key;

  if (!newRateKey) {
    return { success: false, error: 'No rate key available for booking' };
  }

  // Fetch quote for customer name
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', task.quote_id)
    .single();

  const customerName = quote?.customer_name || quote?.customerName || 'Guest';
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || 'Guest';
  const lastName = nameParts.slice(1).join(' ') || 'Name';

  // Update status to booking_in_progress
  await supabase
    .from('booking_items')
    .update({ booking_status: 'booking_in_progress' })
    .eq('id', bookingItem.id);

  // Execute HotelBeds booking with new rate key
  try {
    const baseUrl = getHotelBedsBaseUrl();
    const headers = getHotelBedsHeaders();

    const response = await fetch(`${baseUrl}/hotel-api/1.0/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking: {
          holder: { name: firstName, surname: lastName },
          rooms: [{
            rateKey: newRateKey,
            paxes: [{ roomId: 1, type: 'AD', name: firstName, surname: lastName }],
          }],
          clientReference: `${task.quote_id}-${bookingItem.id}`,
          remark: 'Booked after price review approval',
          tolerance: 2.00,
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data.booking) {
      const confirmationNumber = data.booking.reference;

      await supabase.from('booking_items').update({
        booking_status: 'booked',
        confirmation_number: confirmationNumber,
        confirmed_at: new Date().toISOString(),
        orchestration_error: null,
      }).eq('id', bookingItem.id);

      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: `Approved and booked at new price. Confirmation: ${confirmationNumber}`,
      }).eq('id', task.id);

      return { success: true, confirmationNumber };
    } else {
      const errorMsg = data.error?.message || 'Booking failed after price approval';

      await supabase.from('booking_items').update({
        booking_status: 'failed',
        orchestration_error: errorMsg,
      }).eq('id', bookingItem.id);

      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    await supabase.from('booking_items').update({
      booking_status: 'failed',
      orchestration_error: error.message,
    }).eq('id', bookingItem.id);

    return { success: false, error: error.message };
  }
}

async function handleApproveBooking(supabase: any, task: any, bookingItem: any) {
  if (!bookingItem) return { success: false, error: 'No booking item linked' };

  const attachments = task.attachments || {};
  const rateKey = attachments.newRateKey || bookingItem.price_check_rate_key;

  if (!rateKey) {
    return { success: false, error: 'No rate key available for booking' };
  }

  // Fetch quote for customer name
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', task.quote_id)
    .single();

  const customerName = quote?.customer_name || quote?.customerName || 'Guest';
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || 'Guest';
  const lastName = nameParts.slice(1).join(' ') || 'Name';

  // Update status to booking_in_progress
  await supabase
    .from('booking_items')
    .update({ booking_status: 'booking_in_progress' })
    .eq('id', bookingItem.id);

  // Execute HotelBeds booking
  try {
    const baseUrl = getHotelBedsBaseUrl();
    const headers = getHotelBedsHeaders();

    const response = await fetch(`${baseUrl}/hotel-api/1.0/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking: {
          holder: { name: firstName, surname: lastName },
          rooms: [{
            rateKey,
            paxes: [{ roomId: 1, type: 'AD', name: firstName, surname: lastName }],
          }],
          clientReference: `${task.quote_id}-${bookingItem.id}`,
          remark: 'Booked after agent review and approval',
          tolerance: 2.00,
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data.booking) {
      const confirmationNumber = data.booking.reference;

      await supabase.from('booking_items').update({
        booking_status: 'booked',
        confirmation_number: confirmationNumber,
        confirmed_at: new Date().toISOString(),
        orchestration_error: null,
      }).eq('id', bookingItem.id);

      // Update supplier expense
      if (quote?.id) {
        await supabase
          .from('expenses')
          .update({ status: 'booked' })
          .eq('quote_id', quote.id)
          .eq('subcategory', bookingItem.type);
      }

      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: `Approved and booked. Confirmation: ${confirmationNumber}`,
      }).eq('id', task.id);

      return { success: true, confirmationNumber };
    } else {
      const errorMsg = data.error?.message || 'Booking API returned error';

      await supabase.from('booking_items').update({
        booking_status: 'failed',
        orchestration_error: errorMsg,
      }).eq('id', bookingItem.id);

      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: `Booking failed: ${errorMsg}`,
      }).eq('id', task.id);

      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    await supabase.from('booking_items').update({
      booking_status: 'failed',
      orchestration_error: error.message,
    }).eq('id', bookingItem.id);

    return { success: false, error: error.message };
  }
}

async function handleRejectPrice(supabase: any, task: any, bookingItem: any) {
  if (bookingItem) {
    await supabase.from('booking_items').update({
      booking_status: 'cancelled',
      orchestration_error: 'Price rejected by agent',
    }).eq('id', bookingItem.id);
  }

  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: 'Price rejected. Item cancelled.',
  }).eq('id', task.id);

  return { success: true, message: 'Price rejected, item cancelled' };
}

async function handleRetryBooking(supabase: any, task: any, bookingItem: any) {
  if (!bookingItem) return { success: false, error: 'No booking item linked' };

  const retryCount = (bookingItem.retry_count || 0) + 1;

  await supabase.from('booking_items').update({
    booking_status: 'holding',
    orchestration_error: null,
    retry_count: retryCount,
  }).eq('id', bookingItem.id);

  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: `Retry #${retryCount} initiated`,
  }).eq('id', task.id);

  // Re-trigger orchestration for this single item
  // The orchestrator is idempotent — it will re-process 'holding' items
  const { orchestrateBooking } = await import('@/lib/booking/orchestrator');
  if (task.booking_id && task.quote_id) {
    // Run async, don't block the response
    orchestrateBooking(task.booking_id, task.quote_id, task.user_id).catch(console.error);
  }

  return { success: true, message: `Retry #${retryCount} initiated` };
}

async function handleSubmitPassengerDetails(supabase: any, task: any, bookingItem: any, passengerDetails: any) {
  if (!bookingItem) return { success: false, error: 'No booking item linked' };
  if (!passengerDetails || !Array.isArray(passengerDetails) || passengerDetails.length === 0) {
    return { success: false, error: 'Passenger details are required' };
  }

  // Store passenger details on the booking item
  const updatedDetails = {
    ...(bookingItem.details || {}),
    passengers: passengerDetails,
  };

  await supabase.from('booking_items').update({
    details: updatedDetails,
    booking_status: 'booking_in_progress',
  }).eq('id', bookingItem.id);

  // Attempt flight booking (stub — actual API call would go here)
  // For now, mark as needing manual completion since Amadeus/Sabre aren't fully implemented
  const provider = bookingItem.supplier_source || 'api_amadeus';

  if (provider === 'api_amadeus' || provider === 'api_sabre') {
    // These APIs aren't fully implemented yet, create a manual task
    await supabase.from('booking_items').update({
      booking_status: 'awaiting_supplier',
      orchestration_error: `${provider} booking API not yet fully implemented. Manual booking required.`,
    }).eq('id', bookingItem.id);

    await supabase.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: `Passenger details submitted. ${provider} API pending implementation — manual booking required.`,
    }).eq('id', task.id);

    // Create manual booking task with passenger details
    await supabase.from('tasks').insert({
      user_id: task.user_id,
      type: 'manual_booking',
      title: `Manual Flight Booking: ${bookingItem.name}`,
      description: `Passenger details collected. Book via ${provider} manually with the passenger data attached.`,
      priority: 'high',
      status: 'pending',
      quote_id: task.quote_id,
      booking_id: task.booking_id,
      booking_item_id: bookingItem.id,
      contact_id: task.contact_id,
      customer_name: task.customer_name,
      item_type: 'flight',
      item_name: bookingItem.name,
      item_details: updatedDetails,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      attachments: {
        taskType: 'manual_booking',
        passengerDetails,
        provider,
      },
    });

    return { success: true, message: 'Passenger details saved. Manual booking task created.' };
  }

  return { success: true, message: 'Passenger details submitted' };
}

async function handleMarkBooked(supabase: any, task: any, bookingItem: any, confirmationNumber: string, notes?: string) {
  if (!confirmationNumber) {
    return { success: false, error: 'Confirmation number is required' };
  }

  if (bookingItem) {
    await supabase.from('booking_items').update({
      booking_status: 'booked',
      confirmation_number: confirmationNumber,
      confirmed_at: new Date().toISOString(),
      orchestration_error: null,
    }).eq('id', bookingItem.id);
  }

  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: notes || `Manually booked. Confirmation: ${confirmationNumber}`,
  }).eq('id', task.id);

  // Also complete any related awaiting_supplier tasks for same booking item
  if (bookingItem) {
    await supabase.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: `Auto-completed: item booked with confirmation ${confirmationNumber}`,
    })
      .eq('booking_item_id', bookingItem.id)
      .eq('type', 'awaiting_supplier')
      .neq('status', 'completed');
  }

  return { success: true, confirmationNumber };
}

async function handleMarkFailed(supabase: any, task: any, bookingItem: any, notes?: string) {
  if (bookingItem) {
    await supabase.from('booking_items').update({
      booking_status: 'failed',
      orchestration_error: notes || 'Marked as failed by agent',
    }).eq('id', bookingItem.id);
  }

  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: notes || 'Marked as failed',
  }).eq('id', task.id);

  // Create escalation task
  await supabase.from('tasks').insert({
    user_id: task.user_id,
    type: 'booking_failed',
    title: `Escalation: ${task.item_name || bookingItem?.name || 'Unknown Item'}`,
    description: `Booking failed and needs escalation. ${notes || ''}`,
    priority: 'urgent',
    status: 'pending',
    quote_id: task.quote_id,
    booking_id: task.booking_id,
    booking_item_id: bookingItem?.id,
    contact_id: task.contact_id,
    customer_name: task.customer_name,
    item_type: task.item_type,
    item_name: task.item_name,
    due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    attachments: { taskType: 'booking_failed', escalated: true },
  });

  return { success: true, message: 'Marked as failed, escalation task created' };
}

async function handleSupplierConfirmed(supabase: any, task: any, bookingItem: any, confirmationNumber?: string, notes?: string) {
  if (bookingItem && confirmationNumber) {
    await supabase.from('booking_items').update({
      booking_status: 'booked',
      confirmation_number: confirmationNumber,
      confirmed_at: new Date().toISOString(),
      orchestration_error: null,
    }).eq('id', bookingItem.id);
  }

  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: notes || `Supplier confirmed. ${confirmationNumber ? `Confirmation: ${confirmationNumber}` : ''}`,
  }).eq('id', task.id);

  return { success: true, message: 'Supplier confirmation recorded' };
}

async function handleEscalate(supabase: any, task: any, bookingItem: any, notes?: string) {
  await supabase.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: `Escalated: ${notes || 'No response from supplier'}`,
  }).eq('id', task.id);

  // Create urgent escalation task
  await supabase.from('tasks').insert({
    user_id: task.user_id,
    type: 'booking_failed',
    title: `ESCALATION: No supplier response for ${task.item_name || bookingItem?.name}`,
    description: `Supplier has not responded. ${notes || 'Needs immediate attention.'}`,
    priority: 'urgent',
    status: 'pending',
    quote_id: task.quote_id,
    booking_id: task.booking_id,
    booking_item_id: bookingItem?.id,
    contact_id: task.contact_id,
    customer_name: task.customer_name,
    item_type: task.item_type,
    item_name: task.item_name,
    due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    attachments: { taskType: 'booking_failed', escalated: true, reason: 'no_supplier_response' },
  });

  return { success: true, message: 'Escalation task created' };
}
