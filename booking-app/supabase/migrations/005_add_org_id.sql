-- ============================================
-- Migration: Add org_id to all data tables
-- Date: 2026-02-28
-- Purpose: Scope all data to organizations (DB is empty, no backfill needed)
-- ============================================

-- 1. Add org_id to contacts
ALTER TABLE public.contacts
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON public.contacts(org_id);

-- 2. Add org_id to quotes
ALTER TABLE public.quotes
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON public.quotes(org_id);

-- 3. Add org_id to bookings
ALTER TABLE public.bookings
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_bookings_org_id ON public.bookings(org_id);

-- 4. Add org_id to invoices
ALTER TABLE public.invoices
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(org_id);

-- 5. Add org_id to payments
ALTER TABLE public.payments
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON public.payments(org_id);

-- 6. Add org_id to commissions
ALTER TABLE public.commissions
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_commissions_org_id ON public.commissions(org_id);

-- 7. Add org_id to tasks
ALTER TABLE public.tasks
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);

-- 8. Add org_id to expenses
ALTER TABLE public.expenses
  ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses(org_id);

-- 9. Update subscriptions: add org_id, seat_count, change unique constraint
ALTER TABLE public.subscriptions
  ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN seat_count INTEGER NOT NULL DEFAULT 1;

-- Drop old user_id unique constraint and add org_id unique constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS unique_user_subscription;
ALTER TABLE public.subscriptions ADD CONSTRAINT unique_org_subscription UNIQUE(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
