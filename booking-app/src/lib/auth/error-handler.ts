/**
 * Authentication error handling utilities
 * Provides user-friendly error messages and logging
 */

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  action?: 'redirect_login' | 'retry' | 'contact_support';
}

/**
 * Map Supabase auth errors to user-friendly messages
 */
export function handleAuthError(error: any): AuthError {
  const errorMessage = error?.message || 'Unknown error';
  const errorCode = error?.code || error?.status || 'unknown';

  console.error('🔴 Auth Error:', {
    code: errorCode,
    message: errorMessage,
    details: error
  });

  // Map common errors to user-friendly messages
  const errorMap: Record<string, Partial<AuthError>> = {
    'invalid_credentials': {
      userMessage: 'Invalid email or password. Please try again.',
      shouldRetry: true,
    },
    'email_not_confirmed': {
      userMessage: 'Please verify your email address before logging in.',
      shouldRetry: false,
      action: 'contact_support',
    },
    'user_not_found': {
      userMessage: 'No account found with this email address.',
      shouldRetry: false,
    },
    'invalid_grant': {
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: true,
      action: 'redirect_login',
    },
    'refresh_token_not_found': {
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: true,
      action: 'redirect_login',
    },
    'session_not_found': {
      userMessage: 'No active session found. Please log in.',
      shouldRetry: true,
      action: 'redirect_login',
    },
    'network_error': {
      userMessage: 'Network error. Please check your connection and try again.',
      shouldRetry: true,
      action: 'retry',
    },
    'rate_limit': {
      userMessage: 'Too many attempts. Please wait a moment and try again.',
      shouldRetry: true,
    },
  };

  // Check for network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || error?.name === 'NetworkError') {
    return {
      code: 'network_error',
      message: errorMessage,
      userMessage: 'Network error. Please check your connection and try again.',
      shouldRetry: true,
      action: 'retry',
    };
  }

  // Check for rate limiting
  if (errorCode === 429 || errorMessage.includes('rate limit')) {
    return {
      code: 'rate_limit',
      message: errorMessage,
      userMessage: 'Too many attempts. Please wait a moment and try again.',
      shouldRetry: true,
    };
  }

  // Find matching error
  const matchedError = Object.entries(errorMap).find(([key]) =>
    errorMessage.toLowerCase().includes(key.replace(/_/g, ' ')) ||
    errorCode.toString().toLowerCase().includes(key)
  );

  if (matchedError) {
    const [code, config] = matchedError;
    return {
      code,
      message: errorMessage,
      userMessage: config.userMessage!,
      shouldRetry: config.shouldRetry!,
      action: config.action,
    };
  }

  // Default error
  return {
    code: errorCode.toString(),
    message: errorMessage,
    userMessage: 'An error occurred. Please try again.',
    shouldRetry: true,
    action: 'retry',
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      const authError = handleAuthError(error);

      if (!authError.shouldRetry) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Log auth events for debugging
 */
export function logAuthEvent(event: string, data?: any) {
  const timestamp = new Date().toISOString();

  console.log(`🔐 [${timestamp}] ${event}`, data || '');

  // In production, send to analytics/monitoring service
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'auth',
      ...data,
    });
  }
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: any): boolean {
  const authErrorCodes = [401, 403, 'PGRST301'];
  const authErrorMessages = [
    'not authenticated',
    'session expired',
    'invalid token',
    'invalid jwt',
    'jwt expired',
  ];

  const errorCode = error?.code || error?.status;
  const errorMessage = (error?.message || '').toLowerCase();

  return (
    authErrorCodes.includes(errorCode) ||
    authErrorMessages.some(msg => errorMessage.includes(msg))
  );
}

/**
 * Get user-friendly error message for display
 */
export function getErrorMessage(error: any): string {
  const authError = handleAuthError(error);
  return authError.userMessage;
}
