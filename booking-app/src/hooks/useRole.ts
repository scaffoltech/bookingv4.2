import { useAuth } from '@/components/auth/AuthProvider';

interface RoleHookReturn {
  role: string | null;
  isAdmin: boolean;
  isAgent: boolean;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  refreshRole: () => Promise<void>;
}

export function useRole(): RoleHookReturn {
  const { membership, loading, refreshSession } = useAuth();

  // Derive role from org membership
  const role = membership?.role ?? null;

  return {
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isAgent: role === 'agent',
    loading,
    error: null,
    refreshRole: refreshSession,
  };
}
