import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, PLAN } from '@/lib/stripe/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve org from authenticated user
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, role, organizations(id, stripe_customer_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Count active seats for quantity
    const { count: seatCount } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', membership.org_id)
      .eq('status', 'active');

    const org = membership.organizations as any;
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      orgId: membership.org_id,
      quantity: seatCount || 1,
      customerId: org?.stripe_customer_id || undefined,
      successUrl: `${origin}/quotes?checkout=success`,
      cancelUrl: `${origin}/subscribe?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
