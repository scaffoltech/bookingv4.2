-- ============================================
-- Migration: Rewrite all RLS policies to org-scoped
-- Date: 2026-02-28
-- Purpose: Replace per-user RLS with org-scoped using get_user_org_id
-- ============================================

-- ========== CONTACTS ==========
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

CREATE POLICY "Org members can view contacts"
  ON public.contacts FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update contacts"
  ON public.contacts FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete contacts"
  ON public.contacts FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== QUOTES ==========
DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;

CREATE POLICY "Org members can view quotes"
  ON public.quotes FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update quotes"
  ON public.quotes FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete quotes"
  ON public.quotes FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== BOOKINGS ==========
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

CREATE POLICY "Org members can view bookings"
  ON public.bookings FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update bookings"
  ON public.bookings FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete bookings"
  ON public.bookings FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== INVOICES ==========
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

CREATE POLICY "Org members can view invoices"
  ON public.invoices FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete invoices"
  ON public.invoices FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== PAYMENTS ==========
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Org members can view payments"
  ON public.payments FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update payments"
  ON public.payments FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete payments"
  ON public.payments FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== COMMISSIONS ==========
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can insert own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON public.commissions;

CREATE POLICY "Org members can view commissions"
  ON public.commissions FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update commissions"
  ON public.commissions FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete commissions"
  ON public.commissions FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== TASKS ==========
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Org members can view tasks"
  ON public.tasks FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update tasks"
  ON public.tasks FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== EXPENSES ==========
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Org members can view expenses"
  ON public.expenses FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update expenses"
  ON public.expenses FOR UPDATE
  USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete expenses"
  ON public.expenses FOR DELETE
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE org_id = public.get_user_org_id(auth.uid())
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- ========== SUBSCRIPTIONS ==========
-- Update existing RLS to be org-scoped
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Org members can view subscription"
  ON public.subscriptions FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

-- ========== USERS TABLE ==========
-- Allow viewing org teammates
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

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
