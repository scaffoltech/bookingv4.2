-- ============================================
-- Migration: Update handle_new_user trigger for org auto-creation
-- Date: 2026-02-28
-- Purpose: Organic signup creates org + owner membership, invite signup activates pending membership
-- ============================================

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

    -- Update user role from membership role
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

    -- Create owner membership
    INSERT INTO public.org_memberships (org_id, user_id, role, status)
    VALUES (_org_id, NEW.id, 'owner', 'active');

    -- Set user role to admin for org owners
    UPDATE public.users
    SET role = 'admin'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
