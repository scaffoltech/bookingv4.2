import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Authenticate an API route request using Supabase session cookies.
 * Returns the authenticated user or null if not authenticated.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // API routes don't need to set cookies
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
