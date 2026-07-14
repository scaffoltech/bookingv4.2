import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingPortalSession } from '@/lib/stripe/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up customer ID from the user's org
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, organizations(stripe_customer_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const org = membership?.organizations as any;
    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await createBillingPortalSession({
      customerId: org.stripe_customer_id,
      returnUrl: `${origin}/quotes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
