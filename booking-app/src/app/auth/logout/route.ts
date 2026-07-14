import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('🔄 Logout route: Starting server-side logout');

  const supabase = await createClient();

  try {
    // Sign out globally to clear both client and server sessions
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Logout route: Supabase signOut error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Logout route: Server-side logout successful');

    // Return JSON success response (client will handle redirect)
    const response = NextResponse.json({ success: true });

    // Clear auth cookies explicitly
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error: any) {
    console.error('❌ Logout route: Exception during logout:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}

// Support GET for direct browser navigation (redirects to login)
export async function GET(request: Request) {
  console.log('🔄 Logout route: GET request - direct navigation');

  const supabase = await createClient();

  try {
    await supabase.auth.signOut();
    console.log('✅ Logout route: Server-side logout successful');
  } catch (error) {
    console.error('❌ Logout route: Exception during logout:', error);
  }

  // For GET requests, redirect to login page
  const response = NextResponse.redirect(new URL('/auth/login', request.url));

  // Clear auth cookies explicitly
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');

  return response;
}