'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { AppNav } from '@/components/navigation/AppNav';

interface ProtectedRouteProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  requireAuth?: boolean;
  // Defaults to false: flipping this app-wide requires real Stripe keys
  // (still placeholders in .env.local) and would otherwise lock out the
  // existing org/user with no way to subscribe. Set true per-route once
  // billing is actually configured.
  requireSubscription?: boolean;
}

export function ProtectedRoute({
  children,
  showNavigation = false,
  requireAuth = true,
  requireSubscription = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isPostCheckout, setIsPostCheckout] = useState(false);
  const { data: subscriptionData, isLoading: subLoading } = useSubscription({ polling: isPostCheckout });
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!requireSubscription) return;
    const params = new URLSearchParams(window.location.search);
    setIsPostCheckout(params.get('checkout') === 'success');
  }, [requireSubscription]);

  useEffect(() => {
    if (hasRedirected.current) return;
    if (loading) return;

    if (requireAuth && !user) {
      hasRedirected.current = true;
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireSubscription && user && !subLoading && subscriptionData) {
      if (!subscriptionData.isActive && !isPostCheckout) {
        hasRedirected.current = true;
        router.replace('/subscribe');
      }
    }
  }, [user, loading, requireAuth, requireSubscription, pathname, router, subLoading, subscriptionData, isPostCheckout]);

  if (loading || (requireSubscription && subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{loading ? 'Checking authentication...' : 'Checking subscription...'}</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (requireSubscription && subscriptionData && !subscriptionData.isActive && !isPostCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to subscribe...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showNavigation && <AppNav />}
      <div className={showNavigation ? "pt-16" : ""}>
        {children}
      </div>
    </>
  );
}
