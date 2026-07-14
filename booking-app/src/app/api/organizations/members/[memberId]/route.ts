import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/subscriptions';

// PATCH: Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();

    if (!['admin', 'agent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check user is owner/admin
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Can't change owner role
    const { data: targetMember } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('id', memberId)
      .eq('org_id', membership.org_id)
      .single();

    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
    }

    const { error } = await supabase
      .from('org_memberships')
      .update({ role })
      .eq('id', memberId)
      .eq('org_id', membership.org_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update member role error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// DELETE: Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user is owner/admin
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Can't remove the owner
    const { data: targetMember } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('id', memberId)
      .eq('org_id', membership.org_id)
      .single();

    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 403 });
    }

    // Set status to removed
    const { error } = await supabase
      .from('org_memberships')
      .update({ status: 'removed' })
      .eq('id', memberId)
      .eq('org_id', membership.org_id);

    if (error) throw error;

    // Decrement Stripe seat quantity
    const adminSupabase = await createAdminClient();
    try {
      const { data: subscription } = await adminSupabase
        .from('subscriptions')
        .select('stripe_subscription_id, seat_count')
        .eq('org_id', membership.org_id)
        .single();

      if (subscription?.stripe_subscription_id && subscription.seat_count > 1) {
        const newSeatCount = subscription.seat_count - 1;
        await updateSubscriptionQuantity(subscription.stripe_subscription_id, newSeatCount);

        await adminSupabase
          .from('subscriptions')
          .update({ seat_count: newSeatCount })
          .eq('org_id', membership.org_id);
      }
    } catch (stripeError) {
      console.error('Failed to update Stripe quantity:', stripeError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
