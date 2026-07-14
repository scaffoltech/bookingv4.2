'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🔐 Requesting password reset for:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;

      console.log('✅ Password reset email sent');
      setSuccess(true);
      
      // Clear form after success
      setEmail('');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-clio-gray-950 p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-clio-gray-900 rounded-3xl border border-clio-gray-100 dark:border-clio-gray-800 shadow-strong overflow-hidden">
          <div className="p-10 border-b border-clio-gray-100 dark:border-clio-gray-800 bg-clio-gray-50/50 dark:bg-clio-gray-800/20 text-center">
            <div className="w-16 h-16 bg-clio-blue rounded-2xl flex items-center justify-center shadow-lg shadow-clio-blue/20 mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-black text-clio-gray-900 dark:text-white uppercase tracking-tight">Reset Password</h1>
            <p className="text-[10px] font-black text-clio-gray-400 uppercase tracking-widest mt-2">Recover your account access</p>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">
                      Reset Email Sent
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Check your inbox for password reset instructions. The link will expire in 1 hour.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">
                    Work Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
                  />
                  <p className="text-xs text-clio-gray-500 dark:text-clio-gray-400 ml-1 mt-2">
                    Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-clio-blue hover:bg-clio-blue/90 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg shadow-clio-blue/20"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => setSuccess(false)}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-clio-gray-200 dark:border-clio-gray-800 font-bold uppercase tracking-tight text-[10px]"
                >
                  Send Another Email
                </Button>
              </div>
            )}

            <div className="pt-4">
              <Link 
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-clio-blue hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>

          <div className="p-8 bg-clio-gray-50 dark:bg-clio-gray-800/20 border-t border-clio-gray-100 dark:border-clio-gray-800 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-clio-blue hover:underline">
                Create Workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

