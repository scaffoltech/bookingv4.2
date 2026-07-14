-- =====================================================
-- FULL DATABASE RECREATION
-- Generated: 2026-03-01
-- Merges: schema.sql + all 14 migrations + org migrations
-- =====================================================

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- HELPER FUNCTION: updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: get_user_org_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id(uid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id
  FROM public.org_memberships
  WHERE user_id = uid
    AND status = 'active'
  LIMIT 1;
$$;

-- =====================================================
-- 1. USERS
-- =====================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  role TEXT CHECK (role IN ('admin', 'agent', 'client')),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- =====================================================
-- 2. ORGANIZATIONS
-- =====================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- =====================================================
-- 3. ORG_MEMBERSHIPS
-- =====================================================
CREATE TABLE public.org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'removed')),
  invited_email TEXT,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_org_user UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_memberships_org_id ON public.org_memberships(org_id);
CREATE INDEX idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX idx_org_memberships_invite_token ON public.org_memberships(invite_token);
CREATE INDEX idx_org_memberships_invited_email ON public.org_memberships(invited_email);

-- =====================================================
-- 4. CONTACTS
-- =====================================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  type TEXT DEFAULT 'customer' CHECK (type IN ('customer', 'supplier')),

  company TEXT,
  notes TEXT,
  tags TEXT[],

  address JSONB,
  preferences JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_org_id ON public.contacts(org_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_contacts_first_name ON public.contacts(first_name);
CREATE INDEX idx_contacts_last_name ON public.contacts(last_name);

-- =====================================================
-- 5. QUOTES
-- =====================================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  quote_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'booked', 'cancelled')),
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  items JSONB NOT NULL,
  valid_until DATE,
  notes TEXT,

  -- Payment tracking (migration 20260106)
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'deposit_paid', 'partially_paid', 'paid_in_full', 'refunded')),
  total_paid DECIMAL(12, 2) DEFAULT 0,
  remaining_balance DECIMAL(12, 2),

  -- Optimistic locking (migration 20260215)
  version INTEGER NOT NULL DEFAULT 1,

  -- Travel dates & commission (referenced by useQuoteMutations, confirm-payment)
  travel_start_date DATE,
  travel_end_date DATE,
  commission_rate DECIMAL(5, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_contact_id ON public.quotes(contact_id);
CREATE INDEX idx_quotes_org_id ON public.quotes(org_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_payment_status ON public.quotes(payment_status);

-- =====================================================
-- 6. BOOKINGS (booking_data dropped; replaced by booking_items)
-- =====================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  booking_reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'booked', 'cancelled', 'completed')),
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  notes TEXT,

  -- Orchestration (migration 20260224)
  orchestration_status TEXT DEFAULT 'pending'
    CHECK (orchestration_status IN ('pending', 'in_progress', 'completed', 'partial', 'failed')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_contact_id ON public.bookings(contact_id);
CREATE INDEX idx_bookings_org_id ON public.bookings(org_id);
CREATE INDEX idx_bookings_quote_id ON public.bookings(quote_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_orchestration_status ON public.bookings(orchestration_status);

-- =====================================================
-- 7. BOOKING_ITEMS
-- =====================================================
CREATE TABLE public.booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('flight', 'hotel', 'activity', 'transfer')),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,

  price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  details JSONB NOT NULL DEFAULT '{}'::jsonb,

  supplier TEXT,
  supplier_source TEXT,
  supplier_cost DECIMAL(12, 2),
  client_price DECIMAL(12, 2),
  platform_fee DECIMAL(12, 2),
  agent_markup DECIMAL(12, 2),

  booking_status TEXT DEFAULT 'not_booked'
    CHECK (booking_status IN (
      'not_booked', 'pending', 'confirmed', 'failed', 'cancelled', 'booked',
      'holding', 'price_checking', 'price_changed', 'booking_in_progress',
      'awaiting_supplier', 'awaiting_passenger_details'
    )),
  confirmation_number TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,

  cancellation_policy JSONB,

  -- Quote item linkage (migration 20260215)
  quote_item_id TEXT,

  -- Orchestration columns (migration 20260224)
  last_checked_price DECIMAL(12, 2),
  price_check_rate_key TEXT,
  orchestration_error TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX idx_booking_items_type ON public.booking_items(type);
CREATE INDEX idx_booking_items_status ON public.booking_items(booking_status);
CREATE INDEX idx_booking_items_start_date ON public.booking_items(start_date);
CREATE INDEX idx_booking_items_quote_item_id ON public.booking_items(quote_item_id);

-- =====================================================
-- 8. INVOICES
-- =====================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  invoice_number TEXT UNIQUE NOT NULL,

  total DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),

  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Generated backward-compat alias
  amount DECIMAL(12, 2) GENERATED ALWAYS AS (total) STORED,

  -- Extended columns (migration 20250114)
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12, 2),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  terms TEXT DEFAULT 'Net 30',
  payments JSONB DEFAULT '[]'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  overdue_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Customer denormalized fields (migration 20250114)
  customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_address TEXT,

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_contact_id ON public.invoices(contact_id);
CREATE INDEX idx_invoices_org_id ON public.invoices(org_id);
CREATE INDEX idx_invoices_quote_id ON public.invoices(quote_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_customer_email ON public.invoices(customer_email);

-- =====================================================
-- 9. PAYMENTS
-- =====================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  stripe_payment_intent_id TEXT,

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'booked')),
  metadata JSONB,

  -- Quote payment fields (migration 20250107)
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  type TEXT CHECK (type IS NULL OR type IN ('full', 'deposit', 'balance')),
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_contact_id ON public.payments(contact_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_org_id ON public.payments(org_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_pi ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_quote_id ON public.payments(quote_id);
CREATE INDEX idx_payments_type ON public.payments(type);
CREATE INDEX idx_payments_stripe_customer ON public.payments(stripe_customer_id);

-- =====================================================
-- 10. COMMISSIONS
-- =====================================================
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Renamed from amount/rate (migration 20250114)
  commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10,

  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  -- Extended columns (migration 20250114)
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  agent_name TEXT,
  customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name TEXT,
  booking_amount DECIMAL(12, 2),
  payment_method TEXT,
  transaction_id TEXT,
  booking_type TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX idx_commissions_booking_id ON public.commissions(booking_id);
CREATE INDEX idx_commissions_org_id ON public.commissions(org_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_quote_id ON public.commissions(quote_id);
CREATE INDEX idx_commissions_invoice_id ON public.commissions(invoice_id);
CREATE INDEX idx_commissions_agent_id ON public.commissions(agent_id);
CREATE INDEX idx_commissions_customer_id ON public.commissions(customer_id);

-- =====================================================
-- 11. TASKS
-- =====================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB,

  -- Quote item fields (migration 20260107)
  quote_item_id UUID,
  item_type TEXT,
  item_name TEXT,
  customer_name TEXT,

  -- Orchestration (migration 20260224)
  booking_item_id UUID REFERENCES public.booking_items(id),
  type TEXT,
  item_details JSONB,

  -- Assignment & workflow (referenced by useTaskMutations)
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  blocked_reason TEXT,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_quote_id ON public.tasks(quote_id);
CREATE INDEX idx_tasks_booking_item_id ON public.tasks(booking_item_id);
CREATE INDEX idx_tasks_type ON public.tasks(type);

-- =====================================================
-- 12. EXPENSES
-- =====================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'supplier_payment', 'marketing', 'operational', 'commission',
    'office', 'travel', 'technology', 'other'
  )),
  subcategory TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,

  description TEXT NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  supplier_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  receipt_url TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_date TIMESTAMP WITH TIME ZONE,

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'booked', 'cancelled')),
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN (
    'credit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'stripe', 'auto_deducted'
  )),

  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('monthly', 'quarterly', 'yearly')),

  booking_id TEXT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  tags TEXT[],
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_org_id ON public.expenses(org_id);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX idx_expenses_supplier_id ON public.expenses(supplier_id);
CREATE INDEX idx_expenses_booking_id ON public.expenses(booking_id);
CREATE INDEX idx_expenses_quote_id ON public.expenses(quote_id);
CREATE INDEX idx_expenses_agent_id ON public.expenses(agent_id);

-- =====================================================
-- 13. HOTELS (cache)
-- =====================================================
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location JSONB NOT NULL,
  rating DECIMAL(2, 1),
  amenities JSONB,
  images JSONB,
  description TEXT,
  cached_rates JSONB,
  last_fetched TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- 14. FLIGHTS (cache)
-- =====================================================
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_number TEXT NOT NULL,
  airline TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price_data JSONB,
  cached_availability JSONB,
  last_fetched TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- 15. SUBSCRIPTIONS
-- =====================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,

  plan TEXT NOT NULL CHECK (plan IN ('starter', 'professional')),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),

  seat_count INTEGER NOT NULL DEFAULT 1,

  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_org_subscription UNIQUE(org_id),
  CONSTRAINT unique_stripe_subscription UNIQUE(stripe_subscription_id)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- 16. AI_QUERY_CONTEXTS (ephemeral AI context)
-- =====================================================
CREATE TABLE public.ai_query_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  query_type TEXT NOT NULL DEFAULT 'client_message_analysis'
    CHECK (query_type IN (
      'client_message_analysis', 'reply_draft', 'impact_estimate', 'funnel_prompt', 'general'
    )),

  context_json JSONB NOT NULL,
  context_hash TEXT,

  expires_at TIMESTAMPTZ NOT NULL DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '1 hour'),
  consumed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_ai_query_contexts_user_id ON public.ai_query_contexts(user_id);
CREATE INDEX idx_ai_query_contexts_quote_id ON public.ai_query_contexts(quote_id);
CREATE INDEX idx_ai_query_contexts_expires_at ON public.ai_query_contexts(expires_at);
CREATE INDEX idx_ai_query_contexts_created_at ON public.ai_query_contexts(created_at DESC);

-- =====================================================
-- 17. AI_AUDIT_LOGS
-- =====================================================
CREATE TABLE public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  context_id UUID REFERENCES public.ai_query_contexts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'context_created', 'analysis_requested', 'analysis_completed',
      'draft_requested', 'draft_completed', 'task_suggested', 'task_created',
      'quote_patch_suggested', 'quote_patch_applied',
      'reply_approved', 'reply_sent', 'error'
    )),

  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT,

  request_payload JSONB,
  response_payload JSONB,

  confidence TEXT DEFAULT 'unknown'
    CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),

  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'error', 'blocked', 'skipped')),

  error_message TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  tokens_input INTEGER CHECK (tokens_input IS NULL OR tokens_input >= 0),
  tokens_output INTEGER CHECK (tokens_output IS NULL OR tokens_output >= 0),
  tokens_total INTEGER CHECK (tokens_total IS NULL OR tokens_total >= 0),
  cost_estimate_usd NUMERIC(12, 6),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_ai_audit_logs_user_id ON public.ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_context_id ON public.ai_audit_logs(context_id);
CREATE INDEX idx_ai_audit_logs_quote_id ON public.ai_audit_logs(quote_id);
CREATE INDEX idx_ai_audit_logs_created_at ON public.ai_audit_logs(created_at DESC);

-- =====================================================
-- 18. FUND_ALLOCATIONS
-- =====================================================
CREATE TABLE public.fund_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_id TEXT,
  quote_id UUID REFERENCES public.quotes(id),
  quote_item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  source TEXT NOT NULL,
  client_paid DECIMAL(10, 2) NOT NULL,
  supplier_cost DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  agent_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
  escrow_status TEXT NOT NULL DEFAULT 'held'
    CHECK (escrow_status IN ('held', 'released', 'refunded')),
  needs_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fund_allocations_quote_id ON public.fund_allocations(quote_id);
CREATE INDEX idx_fund_allocations_user_id ON public.fund_allocations(user_id);

-- =====================================================
-- 19. TRANSACTIONS (financial audit trail)
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL
    CHECK (type IN ('payment_received', 'expense_recorded', 'refund_issued', 'commission_recorded')),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  quote_id UUID REFERENCES public.quotes(id),
  invoice_id UUID REFERENCES public.invoices(id),
  payment_id TEXT,
  commission_id UUID REFERENCES public.commissions(id),
  expense_id UUID REFERENCES public.expenses(id),
  agent_id UUID REFERENCES public.users(id),
  customer_id UUID REFERENCES public.contacts(id),
  description TEXT,
  timestamp TIMESTAMPTZ,
  performed_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  related_transactions UUID[],
  previous_state JSONB,
  new_state JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_quote_id ON public.transactions(quote_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_query_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ========== USERS ==========
CREATE POLICY "Users can view own profile and org teammates"
  ON public.users FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT om.user_id FROM public.org_memberships om
      WHERE om.org_id = public.get_user_org_id(auth.uid())
        AND om.status = 'active'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ========== ORGANIZATIONS ==========
CREATE POLICY "Members can view own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Owner can update own org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Service role full access on organizations"
  ON public.organizations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ========== ORG_MEMBERSHIPS ==========
CREATE POLICY "Members can view org memberships"
  ON public.org_memberships FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Owner/admin can invite members"
  ON public.org_memberships FOR INSERT
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Owner/admin can update memberships"
  ON public.org_memberships FOR UPDATE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Owner/admin can delete memberships"
  ON public.org_memberships FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Service role full access on org_memberships"
  ON public.org_memberships FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ========== ORG-SCOPED DATA TABLES ==========
-- contacts
CREATE POLICY "Org members can view contacts" ON public.contacts FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert contacts" ON public.contacts FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update contacts" ON public.contacts FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete contacts" ON public.contacts FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- quotes
CREATE POLICY "Org members can view quotes" ON public.quotes FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert quotes" ON public.quotes FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update quotes" ON public.quotes FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete quotes" ON public.quotes FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- bookings
CREATE POLICY "Org members can view bookings" ON public.bookings FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert bookings" ON public.bookings FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update bookings" ON public.bookings FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete bookings" ON public.bookings FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- booking_items (via booking ownership)
CREATE POLICY "Users can view their booking items" ON public.booking_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_items.booking_id
    AND bookings.org_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Users can insert booking items" ON public.booking_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_items.booking_id
    AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can update booking items" ON public.booking_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_items.booking_id
    AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can delete booking items" ON public.booking_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_items.booking_id
    AND bookings.user_id = auth.uid()));

-- invoices
CREATE POLICY "Org members can view invoices" ON public.invoices FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert invoices" ON public.invoices FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update invoices" ON public.invoices FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete invoices" ON public.invoices FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- payments
CREATE POLICY "Org members can view payments" ON public.payments FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert payments" ON public.payments FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update payments" ON public.payments FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete payments" ON public.payments FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- commissions
CREATE POLICY "Org members can view commissions" ON public.commissions FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert commissions" ON public.commissions FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update commissions" ON public.commissions FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete commissions" ON public.commissions FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- tasks
CREATE POLICY "Org members can view tasks" ON public.tasks FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert tasks" ON public.tasks FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update tasks" ON public.tasks FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete tasks" ON public.tasks FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- expenses
CREATE POLICY "Org members can view expenses" ON public.expenses FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can insert expenses" ON public.expenses FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update expenses" ON public.expenses FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete expenses" ON public.expenses FOR DELETE
  USING (org_id = public.get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.org_memberships WHERE org_id = public.get_user_org_id(auth.uid())
        AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')));

-- subscriptions
CREATE POLICY "Org members can view subscription" ON public.subscriptions FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Service role full access on subscriptions" ON public.subscriptions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- hotels (public read)
CREATE POLICY "Anyone can view hotels" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert hotels" ON public.hotels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update hotels" ON public.hotels
  FOR UPDATE USING (auth.role() = 'authenticated');

-- flights (public read)
CREATE POLICY "Anyone can view flights" ON public.flights FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert flights" ON public.flights
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update flights" ON public.flights
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ai_query_contexts
CREATE POLICY "Users can view own AI contexts" ON public.ai_query_contexts FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own AI contexts" ON public.ai_query_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own AI contexts" ON public.ai_query_contexts FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can delete own AI contexts" ON public.ai_query_contexts FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ai_audit_logs
CREATE POLICY "Users can view own AI audit logs" ON public.ai_audit_logs FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own AI audit logs" ON public.ai_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update AI audit logs" ON public.ai_audit_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete AI audit logs" ON public.ai_audit_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- fund_allocations
CREATE POLICY "Users can view own allocations" ON public.fund_allocations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own allocations" ON public.fund_allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_memberships_updated_at BEFORE UPDATE ON public.org_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-CREATE USER + ORG ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _slug TEXT;
  _pending_membership RECORD;
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'invited_role', 'admin'),
    NOW(),
    NOW()
  );

  -- Check for pending invite membership matching this email
  SELECT * INTO _pending_membership
  FROM public.org_memberships
  WHERE invited_email = NEW.email
    AND status = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF _pending_membership.id IS NOT NULL THEN
    -- INVITE PATH: Activate the pending membership
    UPDATE public.org_memberships
    SET user_id = NEW.id,
        status = 'active',
        updated_at = NOW()
    WHERE id = _pending_membership.id;

    UPDATE public.users
    SET role = _pending_membership.role
    WHERE id = NEW.id;
  ELSE
    -- ORGANIC SIGNUP PATH: Create new org + owner membership
    _slug := LOWER(REPLACE(
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), SPLIT_PART(NEW.email, '@', 1)),
      ' ', '-'
    )) || '-' || SUBSTR(gen_random_uuid()::text, 1, 8);

    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
               COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), SPLIT_PART(NEW.email, '@', 1)) || '''s Agency'),
      _slug,
      NEW.id
    )
    RETURNING id INTO _org_id;

    INSERT INTO public.org_memberships (org_id, user_id, role, status)
    VALUES (_org_id, NEW.id, 'owner', 'active');

    UPDATE public.users
    SET role = 'admin'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- AI CONTEXT CLEANUP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_query_contexts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_query_contexts
  WHERE expires_at < TIMEZONE('utc', NOW());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
