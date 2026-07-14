import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isActive: boolean;
  subscription: {
    id: string;
    plan: string;
    status: string;
    seat_count: number;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at: string | null;
  } | null;
}

interface UseSubscriptionOptions {
  polling?: boolean;
}

export function useSubscription(options?: UseSubscriptionOptions) {
  const { polling = false } = options ?? {};
  const { org } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status', org?.id],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/status');
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
    staleTime: polling ? 0 : 60_000,
    retry: polling ? 5 : 1,
    refetchInterval: polling ? 2000 : false,
  });
}
