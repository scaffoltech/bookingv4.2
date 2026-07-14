'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Check if there's a valid session (from the magic link)
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session validation error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
          setValidatingToken(false);
          return;
        }

        if (!session) {
          setError('No valid session found. Please request a new password reset.');
          setValidatingToken(false);
          return;
        }

        console.log('✅ Valid reset session found');
        setValidatingToken(false);
      } catch (err) {
        console.error('❌ Session check failed:', err);
        setError('Failed to validate reset link');
        setValidatingToken(false);
      }
    };

    checkSession();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Updating password...');

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      console.log('✅ Password updated successfully');
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Password update error:', error);
      setError(error.message || 'Failed to update password');
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-clio-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-clio-blue mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400">
            Validating Reset Link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-clio-gray-950 p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-clio-gray-900 rounded-3xl border border-clio-gray-100 dark:border-clio-gray-800 shadow-strong overflow-hidden">
          <div className="p-10 border-b border-clio-gray-100 dark:border-clio-gray-800 bg-clio-gray-50/50 dark:bg-clio-gray-800/20 text-center">
            <div className="w-16 h-16 bg-clio-blue rounded-2xl flex items-center justify-center shadow-lg shadow-clio-blue/20 mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-black text-clio-gray-900 dark:text-white uppercase tracking-tight">
              Update Password
            </h1>
            <p className="text-[10px] font-black text-clio-gray-400 uppercase tracking-widest mt-2">
              Choose a new secure password
            </p>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                  {error}
                </p>
                {error.includes('Invalid or expired') && (
                  <div className="mt-4">
                    <Link href="/auth/reset">
                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-xl border-red-200 dark:border-red-900/30 font-bold uppercase tracking-tight text-[10px] text-red-600 dark:text-red-400"
                      >
                        Request New Reset Link
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">
                      Password Updated
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Your password has been successfully updated. Redirecting to login...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!success && !error?.includes('Invalid or expired') && (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-clio-gray-400 hover:text-clio-gray-600 dark:hover:text-clio-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-clio-gray-500 dark:text-clio-gray-400 ml-1">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-clio-gray-400 hover:text-clio-gray-600 dark:hover:text-clio-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-clio-blue hover:bg-clio-blue/90 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg shadow-clio-blue/20"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}
          </div>

          <div className="p-8 bg-clio-gray-50 dark:bg-clio-gray-800/20 border-t border-clio-gray-100 dark:border-clio-gray-800 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-clio-blue hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

