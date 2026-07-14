-- =====================================================
-- MIGRATION: Fix Schema Mismatches
-- Date: 2025-10-07
-- Description: Add missing columns to expenses, invoices, and commissions tables
--              to match application code expectations
-- =====================================================

-- =====================================================
-- 1. FIX EXPENSES TABLE
-- =====================================================
-- Check and add payment_method column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'expenses'
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN payment_method TEXT CHECK (payment_method IN (
      'credit_card',
      'bank_transfer',
      'cash',
      'check',
      'paypal',
      'stripe',
      'auto_deducted'
    ));
  END IF;
END $$;

-- =====================================================
-- 2. FIX INVOICES TABLE
-- =====================================================
-- Add missing customer columns if they don't exist
DO $$
BEGIN
  -- Add customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;

  -- Add customer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN customer_name TEXT;
  END IF;

  -- Add customer_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN customer_email TEXT;
  END IF;

  -- Add customer_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN customer_address TEXT;
  END IF;

  -- Add amount as alias for total (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN amount DECIMAL(12, 2) GENERATED ALWAYS AS (total) STORED;
  END IF;

  -- Add items column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'items'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add subtotal column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN subtotal DECIMAL(12, 2);
  END IF;

  -- Add tax_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN tax_rate DECIMAL(5, 2) DEFAULT 0;
  END IF;

  -- Add tax_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN tax_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Add discount_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Add notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN notes TEXT;
  END IF;

  -- Add terms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'terms'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN terms TEXT DEFAULT 'Net 30';
  END IF;

  -- Add payments column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'payments'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN payments JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add sent_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add viewed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add overdue_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'overdue_at'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN overdue_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =====================================================
-- 3. FIX COMMISSIONS TABLE
-- =====================================================
DO $$
BEGIN
  -- Add quote_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;
  END IF;

  -- Add invoice_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;

  -- Add agent_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- Add agent_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'agent_name'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN agent_name TEXT;
  END IF;

  -- Add customer_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;

  -- Add customer_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN customer_name TEXT;
  END IF;

  -- Add booking_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'booking_amount'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN booking_amount DECIMAL(12, 2);
  END IF;

  -- Add commission_rate column (rename rate if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'rate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE public.commissions
    RENAME COLUMN rate TO commission_rate;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10;
  END IF;

  -- Add commission_amount column (rename amount if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'amount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE public.commissions
    RENAME COLUMN amount TO commission_amount;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN payment_method TEXT;
  END IF;

  -- Add transaction_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN transaction_id TEXT;
  END IF;

  -- Add booking_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN booking_type TEXT;
  END IF;
END $$;

-- =====================================================
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- =====================================================
-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

-- Indexes for commissions
CREATE INDEX IF NOT EXISTS idx_commissions_quote_id ON public.commissions(quote_id);
CREATE INDEX IF NOT EXISTS idx_commissions_invoice_id ON public.commissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON public.commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_customer_id ON public.commissions(customer_id);

-- =====================================================
-- 5. UPDATE EXISTING DATA (if needed)
-- =====================================================
-- Set default values for new columns where null
UPDATE public.invoices
SET
  subtotal = COALESCE(subtotal, total),
  items = COALESCE(items, '[]'::jsonb),
  payments = COALESCE(payments, '[]'::jsonb)
WHERE subtotal IS NULL OR items IS NULL OR payments IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- After running, verify with:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('expenses', 'invoices', 'commissions')
-- ORDER BY table_name, column_name;