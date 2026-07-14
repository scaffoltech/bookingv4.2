import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has an active subscription via their org membership
      const { data: membership } = await supabase
        .from('org_memberships')
        .select('org_id')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .single();

      let hasActiveSubscription = false;
      if (membership) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('org_id', membership.org_id)
          .single();

        hasActiveSubscription = !!subscription &&
          ['trialing', 'active'].includes(subscription.status);
      }

      // Billing enforcement is off by default (see ProtectedRoute's
      // requireSubscription) until real Stripe keys replace the placeholders
      // in .env.local — turning this on now would lock out every user.
      void hasActiveSubscription;
      return NextResponse.redirect(`${origin}/quotes`);
    }

    // Log authentication error for debugging
    if (error) {
      console.error('Auth callback error:', error);
    }
  }

  // Return the user to login with error message
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate user`);
}
