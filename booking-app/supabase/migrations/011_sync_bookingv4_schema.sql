-- Additive sync: bring the live schema up to what booking-gpt-expt's
-- application code (now ported into this app) expects. Every change here
-- is additive (new nullable columns / widened CHECK constraints) so it is
-- safe to run against the existing, populated-or-not live database.

-- expenses -----------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_frequency TEXT
    CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pending', 'paid', 'booked', 'cancelled'));

-- fund_allocations -----------------------------------------------------------
ALTER TABLE public.fund_allocations
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- payments -------------------------------------------------------------------
-- The webhook (payment_intent.succeeded) and the browser's /confirm-payment
-- call both invoke confirmPayment() idempotently by checking for an existing
-- row first; a unique index closes the race where both checks pass before
-- either insert lands.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_pi_unique
  ON public.payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- commissions ---------------------------------------------------------------
-- Domain type (CommissionStatus) and application code use draft/disputed;
-- the original constraint only allowed pending/approved/paid/cancelled.
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'disputed', 'cancelled'));

-- invoices -------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'));

-- quotes -----------------------------------------------------------------------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2);

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'booked', 'cancelled'));

-- tasks --------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS quote_item_id UUID,
  ADD COLUMN IF NOT EXISTS item_type TEXT,
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- transactions -----------------------------------------------------------------
-- org_id never existed on this table in B's own schema either — every write
-- path (including B's) assumes it. Added to match every other financial table.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id),
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS performed_by TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS related_transactions UUID[],
  ADD COLUMN IF NOT EXISTS previous_state JSONB,
  ADD COLUMN IF NOT EXISTS new_state JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'reversed'));

-- 'category' and 'date' are legacy NOT NULL columns from before this app's
-- schema.sql; they're superseded by 'type'/'timestamp' and the application
-- code never populates them. Relax to nullable so inserts succeed.
ALTER TABLE public.transactions ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN date DROP NOT NULL;
