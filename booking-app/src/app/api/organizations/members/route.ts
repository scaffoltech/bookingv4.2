import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/subscriptions';

// GET: List all members in the user's org
export async function GET() {
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
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get all memberships with user info
    const { data: members, error } = await supabase
      .from('org_memberships')
      .select(`
        id,
        org_id,
        user_id,
        role,
        status,
        invited_email,
        invite_expires_at,
        created_at,
        updated_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('org_id', membership.org_id)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('List members error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list members' },
      { status: 500 }
    );
  }
}

// POST: Invite a new member
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role = 'agent' } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

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

    const adminSupabase = await createAdminClient();

    // Check if already a member or has pending invite
    const { data: existing } = await adminSupabase
      .from('org_memberships')
      .select('id, status')
      .eq('org_id', membership.org_id)
      .eq('invited_email', email)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This email already has a pending invite or is already a member' },
        { status: 409 }
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create pending membership
    const { data: newMembership, error: insertError } = await adminSupabase
      .from('org_memberships')
      .insert({
        org_id: membership.org_id,
        role,
        status: 'pending',
        invited_email: email,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Increment Stripe seat quantity
    try {
      const { data: subscription } = await adminSupabase
        .from('subscriptions')
        .select('stripe_subscription_id, seat_count')
        .eq('org_id', membership.org_id)
        .single();

      if (subscription?.stripe_subscription_id) {
        const newSeatCount = (subscription.seat_count || 1) + 1;
        await updateSubscriptionQuantity(subscription.stripe_subscription_id, newSeatCount);

        await adminSupabase
          .from('subscriptions')
          .update({ seat_count: newSeatCount })
          .eq('org_id', membership.org_id);
      }
    } catch (stripeError) {
      console.error('Failed to update Stripe quantity:', stripeError);
      // Don't fail the invite if Stripe update fails
    }

    const inviteLink = `${request.headers.get('origin') || 'http://localhost:3000'}/auth/invite?token=${inviteToken}`;

    return NextResponse.json({
      membership: newMembership,
      inviteLink,
    });
  } catch (error: any) {
    console.error('Invite member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invite member' },
      { status: 500 }
    );
  }
}
