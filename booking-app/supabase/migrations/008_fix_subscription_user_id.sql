-- ============================================
-- Migration: Make user_id nullable on subscriptions
-- Date: 2026-03-02
-- Purpose: Subscriptions are now org-scoped (since migration 005),
--          so user_id should be nullable to avoid upsert failures
--          in the Stripe webhook handler.
-- ============================================

ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;
