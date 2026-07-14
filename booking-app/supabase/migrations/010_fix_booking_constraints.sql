-- Migration 010: Fix Booking Constraints
-- Fixes migration 009 which dropped essential statuses (not_booked, pending, confirmed)
-- from the booking_items CHECK constraint, and adds 'awaiting_payment' to bookings
-- orchestration_status constraint.
-- SAFE TO RUN MULTIPLE TIMES (Idempotent)

BEGIN;

-- Fix 1: booking_items.booking_status — include ALL statuses (original + new)
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_booking_status_check;
ALTER TABLE public.booking_items ADD CONSTRAINT booking_items_booking_status_check
  CHECK (booking_status IN (
    'not_booked',
    'pending',
    'confirmed',
    'failed',
    'cancelled',
    'booked',
    'holding',
    'price_checking',
    'price_changed',
    'booking_in_progress',
    'awaiting_supplier',
    'awaiting_passenger_details',
    'ready_to_book',
    'awaiting_full_payment'
  ));

-- Fix 2: bookings.orchestration_status — add 'awaiting_payment'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_orchestration_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_orchestration_status_check
  CHECK (orchestration_status IN (
    'pending', 'in_progress', 'completed', 'partial', 'failed', 'awaiting_payment'
  ));

-- Fix 3: tasks.type — ensure all orchestration types are included
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check
  CHECK (type IN (
    'book_hotel', 'book_flight', 'book_activity', 'book_transfer',
    'upload_confirmation', 'verify_booking', 'contact_supplier',
    'send_documents', 'manual_booking', 'follow_up',
    'document_collection', 'api_booking', 'price_review',
    'awaiting_supplier', 'booking_failed', 'passenger_details',
    'booking_ready', 'awaiting_payment'
  ));

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
