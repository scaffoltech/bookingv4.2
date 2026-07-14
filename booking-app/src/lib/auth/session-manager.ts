import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Centralized session management utilities
 * Handles session cleanup, validation, and state management
 */

const SESSION_STORAGE_KEYS = [
  'quote-store-supabase',
  'contact-store-supabase',
  'rate-store-supabase',
  'settings-store',
  'sidebar-store',
];

/**
 * Clear all local storage and session storage data
 * Ensures complete cleanup on logout
 */
export function clearAllStorage() {
  try {
    // Clear localStorage
    SESSION_STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    sessionStorage.clear();

    console.log('✅ Storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
}

/**
 * Enhanced logout with complete cleanup
 * Ensures proper session termination across all layers
 */
export async function performLogout(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();

  try {
    console.log('🔄 Starting logout process...');

    // 1. Sign out from Supabase (clears both client and server sessions)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Supabase signOut error:', error);
      throw error;
    }

    // 2. Clear all local storage
    clearAllStorage();

    // 3. Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    console.log('✅ Logout completed successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Logout error:', error);

    // Even if Supabase signOut fails, clear local data
    clearAllStorage();

    return {
      success: false,
      error: error.message || 'Failed to logout'
    };
  }
}

/**
 * Validate that a session is properly established
 * Returns true if session is valid and user is authenticated
 */
export async function validateSession(): Promise<{ valid: boolean; userId?: string }> {
  const supabase = getSupabaseBrowserClient();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Session validation error:', error);
      return { valid: false };
    }

    if (!session || !session.user) {
      console.log('❌ No valid session found');
      return { valid: false };
    }

    console.log('✅ Session validated for user:', session.user.id);
    return {
      valid: true,
      userId: session.user.id
    };
  } catch (error) {
    console.error('❌ Session validation exception:', error);
    return { valid: false };
  }
}

/**
 * Wait for session to be established after login
 * Polls for session with exponential backoff
 */
export async function waitForSession(maxAttempts = 5, initialDelay = 500): Promise<boolean> {
  let attempts = 0;
  let delay = initialDelay;

  while (attempts < maxAttempts) {
    const { valid } = await validateSession();

    if (valid) {
      return true;
    }

    attempts++;

    if (attempts < maxAttempts) {
      console.log(`⏳ Waiting for session... attempt ${attempts}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  console.error('❌ Session not established after', maxAttempts, 'attempts');
  return false;
}

/**
 * Refresh the current session
 * Useful for long-running applications
 */
export async function refreshSession(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();

  try {
    console.log('🔄 Refreshing session...');

    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('❌ Session refresh error:', error);
      return { success: false, error: error.message };
    }

    if (!session) {
      console.error('❌ No session returned after refresh');
      return { success: false, error: 'No session' };
    }

    console.log('✅ Session refreshed successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Session refresh exception:', error);
    return { success: false, error: error.message || 'Failed to refresh session' };
  }
}

/**
 * Get current session info for debugging
 */
export async function getSessionInfo(): Promise<{
  authenticated: boolean;
  userId?: string;
  email?: string;
  expiresAt?: string;
}> {
  const supabase = getSupabaseBrowserClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      userId: session.user.id,
      email: session.user.email,
      expiresAt: new Date(session.expires_at! * 1000).toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting session info:', error);
    return { authenticated: false };
  }
}
