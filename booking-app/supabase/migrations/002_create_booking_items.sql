-- =====================================================
-- MIGRATION 002: Create booking_items Table
-- =====================================================
-- Purpose: Replace JSONB booking_data with normalized booking_items table
-- Date: 2025-01-15
-- =====================================================

-- =====================================================
-- 1. CREATE booking_items TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Core item information
  type TEXT NOT NULL CHECK (type IN ('flight', 'hotel', 'activity', 'transfer')),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,

  -- Pricing information
  price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Type-specific details stored as JSONB for flexibility
  -- (e.g., flight details, hotel room info, activity specifics)
  details JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Supplier tracking
  supplier TEXT,
  supplier_source TEXT,
  supplier_cost DECIMAL(12, 2),
  client_price DECIMAL(12, 2),
  platform_fee DECIMAL(12, 2),
  agent_markup DECIMAL(12, 2),

  -- Booking confirmation status
  booking_status TEXT DEFAULT 'not_booked' CHECK (booking_status IN (
    'not_booked',
    'pending',
    'confirmed',
    'failed',
    'cancelled'
  )),
  confirmation_number TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,

  -- Cancellation policy (stored as JSONB)
  cancellation_policy JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================
CREATE INDEX idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX idx_booking_items_type ON public.booking_items(type);
CREATE INDEX idx_booking_items_status ON public.booking_items(booking_status);
CREATE INDEX idx_booking_items_start_date ON public.booking_items(start_date);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- Users can view booking items for their own bookings
CREATE POLICY "Users can view their booking items" ON public.booking_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Users can insert booking items for their own bookings
CREATE POLICY "Users can insert booking items" ON public.booking_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Users can update booking items for their own bookings
CREATE POLICY "Users can update booking items" ON public.booking_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Users can delete booking items for their own bookings
CREATE POLICY "Users can delete booking items" ON public.booking_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Admins can manage all booking items
CREATE POLICY "Admins can manage all booking items" ON public.booking_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4. CREATE TRIGGER FOR updated_at
-- =====================================================
CREATE TRIGGER update_booking_items_updated_at
  BEFORE UPDATE ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. UPDATE bookings TABLE
-- =====================================================
-- Remove the booking_data JSONB column since we're using booking_items now
-- Note: This will fail if there are existing bookings with data
-- Run data migration first if needed
ALTER TABLE public.bookings DROP COLUMN IF EXISTS booking_data;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- booking_items table created with proper normalization
-- RLS policies configured for security
-- Triggers set up for automatic timestamp updates
-- Old booking_data JSONB column removed
-- =====================================================
