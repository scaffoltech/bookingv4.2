import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json({ hasSubscription: false, isActive: false, subscription: null });
    }

    // Query subscription by org_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', membership.org_id)
      .single();

    if (!subscription) {
      return NextResponse.json({ hasSubscription: false, isActive: false, subscription: null });
    }

    const isActive = ['trialing', 'active'].includes(subscription.status);

    return NextResponse.json({
      hasSubscription: true,
      isActive,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        seat_count: subscription.seat_count,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end,
        cancel_at: subscription.cancel_at,
      },
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
