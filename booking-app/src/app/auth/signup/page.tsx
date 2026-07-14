'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const selectedPlan = searchParams.get('plan');

  // Store selected plan in sessionStorage so it survives email verification
  useEffect(() => {
    if (selectedPlan) {
      sessionStorage.setItem('selectedPlan', selectedPlan);
    }
  }, [selectedPlan]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // User profile is automatically created by database trigger
        setSuccess(true);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
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
      setError(error.message || `Failed to sign up with ${provider}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950">
        <Card className="w-full max-w-md bg-white dark:bg-clio-gray-900 border-clio-gray-200 dark:border-clio-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center uppercase tracking-tight">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-clio-gray-600 dark:text-clio-gray-400 font-medium">
              We've sent you a confirmation email to <strong className="text-clio-gray-900 dark:text-white">{email}</strong>.
              Please click the link in the email to verify your account.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full" variant="outline">
                Back to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-clio-gray-900 border-clio-gray-200 dark:border-clio-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-black text-center uppercase tracking-tight text-clio-gray-900 dark:text-white">Create Account</CardTitle>
          <CardDescription className="text-center text-[10px] font-black uppercase tracking-widest text-clio-gray-400 mt-2">
            Create your workspace as the admin
          </CardDescription>
          <div className="mt-6 p-4 bg-clio-blue/5 dark:bg-clio-blue/10 border border-clio-blue/10 dark:border-clio-blue/20 rounded-2xl shadow-sm">
            <p className="text-xs text-clio-blue font-black uppercase tracking-tight">
              First user? <span className="font-bold opacity-80">You'll become the admin automatically.</span>
            </p>
            <p className="text-[10px] text-clio-blue/60 mt-1.5 font-bold uppercase tracking-widest">
              Already have a workspace? Ask your admin for an invite link.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Company</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="ACME Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="Security Key" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-xl bg-clio-gray-50/50 dark:bg-clio-gray-950 border-clio-gray-200 dark:border-clio-gray-800 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 ml-1">Verify Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Initializing...
                </div>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-clio-gray-100 dark:border-clio-gray-800" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white dark:bg-clio-gray-900 px-4 text-clio-gray-400">
                SSO Gateway
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignUp('google')}
              disabled={loading}
              className="h-12 rounded-xl border-clio-gray-200 dark:border-clio-gray-800 font-bold uppercase tracking-tight text-[10px]"
            >
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthSignUp('github')}
              disabled={loading}
              className="h-12 rounded-xl border-clio-gray-200 dark:border-clio-gray-800 font-bold uppercase tracking-tight text-[10px]"
            >
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-clio-gray-50 dark:bg-clio-gray-800/20 border-t border-clio-gray-100 dark:border-clio-gray-800 text-center rounded-b-3xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-clio-gray-400 w-full">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-clio-blue hover:underline">
              Secure Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}