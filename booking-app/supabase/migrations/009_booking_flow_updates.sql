-- Migration 009: Booking Flow Updates
-- Adds new booking_status values and task types for the refundability-aware orchestration flow.

-- 1. Drop the existing booking_status CHECK constraint and add expanded one
-- Note: If booking_items uses an enum type, alter the enum instead.
-- This approach works for CHECK constraints on a text/varchar column.

-- First check if there's a CHECK constraint (varies by setup)
DO $$
BEGIN
  -- Try to drop existing check constraint if it exists
  BEGIN
    ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS booking_items_booking_status_check;
  EXCEPTION WHEN undefined_object THEN
    -- No constraint to drop
  END;

  -- Add new check constraint with expanded values (includes original + new statuses)
  ALTER TABLE booking_items ADD CONSTRAINT booking_items_booking_status_check
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
END $$;

-- 2. Add awaiting_payment to tasks type if it has a check constraint
DO $$
BEGIN
  BEGIN
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
  EXCEPTION WHEN undefined_object THEN
    -- No constraint to drop
  END;

  -- Re-add with expanded values (include all existing + new)
  ALTER TABLE tasks ADD CONSTRAINT tasks_type_check
    CHECK (type IN (
      'book_hotel', 'book_flight', 'book_activity', 'book_transfer',
      'upload_confirmation', 'verify_booking', 'contact_supplier',
      'send_documents', 'manual_booking', 'follow_up',
      'document_collection', 'api_booking', 'price_review',
      'awaiting_supplier', 'booking_failed', 'passenger_details',
      'booking_ready', 'awaiting_payment'
    ));
END $$;

-- 3. Add index on booking_items for orchestration queries
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_status
  ON booking_items (booking_id, booking_status);

-- 4. Add index on tasks for orchestration lookups
CREATE INDEX IF NOT EXISTS idx_tasks_booking_item_type
  ON tasks (booking_item_id, type) WHERE status NOT IN ('completed', 'cancelled');
