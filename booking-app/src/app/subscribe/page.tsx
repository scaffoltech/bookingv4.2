'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { ModernButton } from '@/components/ui/modern-button';
import { ModernCard } from '@/components/ui/modern-card';
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle';
import { Check, Sparkles, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  'Unlimited quotes & contacts',
  'Advanced quote wizard',
  'Visual timeline planning',
  'Booking & task management',
  'Invoicing & payments',
  'Commission tracking',
  'Team collaboration',
  'Priority support',
];

export default function SubscribePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login?redirectTo=/subscribe');
    }
  }, [authLoading, user, router]);

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    setError(null);

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod: 'monthly' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoadingCheckout(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-clio-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clio-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-clio-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-clio-gray-900 border-b border-clio-gray-200 dark:border-clio-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-clio-blue rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight">TravelFlow</span>
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-7xl font-black text-clio-gray-900 dark:text-white mb-6 uppercase tracking-tight leading-[0.9]">
              Start Your <span className="text-clio-blue">Journey</span>
            </h1>
            <p className="text-xl text-clio-gray-600 dark:text-clio-gray-400 font-medium">
              One plan, full access. Start with a 14-day free trial.
            </p>
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-center">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="max-w-lg mx-auto">
            <ModernCard
              variant="elevated"
              className="p-8 bg-white dark:bg-clio-gray-950 shadow-xl border-2 border-clio-blue"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-black text-clio-gray-900 dark:text-white mb-2 uppercase tracking-tight">TravelFlow Pro</h3>
                <p className="text-clio-gray-500 dark:text-clio-gray-400 text-sm font-bold uppercase">Full access for your team</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-5xl font-black text-clio-gray-900 dark:text-white tracking-tighter">$49</span>
                  <span className="text-clio-gray-400 dark:text-clio-gray-500 text-xs font-bold uppercase ml-2">/seat/month</span>
                </div>
                <p className="text-clio-gray-400 text-xs font-bold uppercase tracking-wide mt-2">14-day free trial included</p>
              </div>

              <ul className="space-y-4 mb-10">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="w-5 h-5 text-clio-blue mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-clio-gray-700 dark:text-clio-gray-300 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <ModernButton
                variant="primary"
                className="w-full h-12 font-black uppercase tracking-tight text-xs bg-clio-blue hover:bg-clio-blue/90"
                onClick={handleCheckout}
                disabled={loadingCheckout}
              >
                {loadingCheckout ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </div>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Free Trial
                  </>
                )}
              </ModernButton>
            </ModernCard>
          </div>

          <p className="text-center text-xs text-clio-gray-400 dark:text-clio-gray-500 font-medium mt-8">
            Add or remove seats anytime from your billing settings.
          </p>
        </div>
      </section>
    </div>
  );
}
