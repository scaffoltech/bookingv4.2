-- ============================================
-- Migration: Create organizations + org_memberships tables
-- Date: 2026-02-28
-- Purpose: Introduce org-level multi-tenancy for TravelFlow
-- ============================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- 2. Create org_memberships table
CREATE TABLE IF NOT EXISTS public.org_memberships (
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

CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON public.org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_invite_token ON public.org_memberships(invite_token);
CREATE INDEX IF NOT EXISTS idx_org_memberships_invited_email ON public.org_memberships(invited_email);

-- 3. Helper function: get_user_org_id
-- Returns the org_id for an active membership of the given user
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

-- 4. RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Members can view their own organization
CREATE POLICY "Members can view own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id(auth.uid()));

-- Only owner can update their org
CREATE POLICY "Owner can update own org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on organizations"
  ON public.organizations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. RLS on org_memberships
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- Members can view memberships in their own org
CREATE POLICY "Members can view org memberships"
  ON public.org_memberships FOR SELECT
  USING (org_id = public.get_user_org_id(auth.uid()));

-- Owner/admin can insert memberships (invites)
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

-- Owner/admin can update memberships (change role, remove)
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

-- Owner/admin can delete memberships
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

-- Service role full access
CREATE POLICY "Service role full access on org_memberships"
  ON public.org_memberships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_memberships_updated_at
  BEFORE UPDATE ON public.org_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
