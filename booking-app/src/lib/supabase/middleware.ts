import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // IMPORTANT: Only set cookies on the response, not on the request
          // Setting on both causes issues with cookie persistence
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Validate user with server-side check (required for proper auth validation)
  // This validates the JWT token with Supabase Auth server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Protected routes — this app keeps its pages at the top level (no /dashboard group)
  const protectedPaths = [
    '/admin',
    '/subscribe',
    '/quotes',
    '/contacts',
    '/invoices',
    '/expenses',
    '/finances',
    '/commissions',
    '/tasks',
    '/timeline',
    '/assistant',
    '/quote-wizard',
    '/modern-ui',
    '/redesign',
    '/debug',
    '/team',
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes (should not be accessible when logged in)
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);

    // Create redirect response and manually transfer all headers to preserve cookies
    const response = NextResponse.redirect(redirectUrl);
    supabaseResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthPath && user) {
    // Check if there's a redirectTo parameter, otherwise default to /dashboard/quotes
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/quotes';

    // Create redirect response and manually transfer all headers to preserve cookies
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    supabaseResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return supabaseResponse;
}