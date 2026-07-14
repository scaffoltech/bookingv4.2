'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Attempting login for:', email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ Login successful');

      // Get redirect destination
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/quotes';

      console.log('🔀 Redirecting to:', redirectTo);

      // Use window.location for reliable navigation after auth
      // This ensures cookies are fully settled and prevents redirect loops
      window.location.href = redirectTo;

      // Keep loading state active during redirect
      // (will unmount when navigation completes)
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || `Failed to login with ${provider}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-clio-gray-950 p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-clio-gray-400 hover:text-clio-blue transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="bg-white dark:bg-clio-gray-900 rounded-3xl border border-clio-gray-100 dark:border-clio-gray-800 shadow-strong overflow-hidden">
          <div className="p-10 border-b border-clio-gray-100 dark:border-clio-gray-800 bg-clio-gray-50/50 dark:bg-clio-gray-800/20 text-center">
            <div className="w-16 h-16 bg-clio-blue rounded-2xl flex items-center justify-center shadow-lg shadow-clio-blue/20 mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-black text-clio-gray-900 dark:text-white uppercase tracking-tight">Welcome Back</h1>
            <p className="text-[10px] font-black text-clio-gray-400 uppercase tracking-widest mt-2">Access your travel management portal</p>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Work Email</Label>
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="Password" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400">Security Key</Label>
                  <Link href="/auth/reset" className="text-[10px] font-black uppercase tracking-widest text-clio-blue hover:underline">Forgot?</Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-clio-blue hover:bg-clio-blue/90 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg shadow-clio-blue/20"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  'Authorize Access'
                )}
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-clio-gray-100 dark:border-clio-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white dark:bg-clio-gray-900 px-4 text-clio-gray-400">SSO Gateway</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                className="h-12 rounded-xl border-clio-gray-200 dark:border-clio-gray-800 font-bold uppercase tracking-tight text-[10px]"
              >
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthLogin('github')}
                disabled={loading}
                className="h-12 rounded-xl border-clio-gray-200 dark:border-clio-gray-800 font-bold uppercase tracking-tight text-[10px]"
              >
                GitHub
              </Button>
            </div>
          </div>

          <div className="p-8 bg-clio-gray-50 dark:bg-clio-gray-800/20 border-t border-clio-gray-100 dark:border-clio-gray-800 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400">
              New to the platform?{' '}
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