'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [token, setToken] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('agent');
  const [orgName, setOrgName] = useState<string>('');
  const [tokenValid, setTokenValid] = useState(false);
  const [validating, setValidating] = useState(true);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const inviteToken = searchParams.get('token');
    if (!inviteToken) {
      setError('No invite token found. Please use the invite link provided.');
      setValidating(false);
      return;
    }

    // Validate invite token against org_memberships
    const validateToken = async () => {
      try {
        const { data: membership, error: fetchError } = await supabase
          .from('org_memberships')
          .select('invited_email, role, invite_expires_at, status, organizations(name)')
          .eq('invite_token', inviteToken)
          .eq('status', 'pending')
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!membership) {
          setError('This invite link is invalid or has already been used.');
          setValidating(false);
          return;
        }

        // Check expiration
        if (membership.invite_expires_at && new Date(membership.invite_expires_at) < new Date()) {
          setError('This invite link has expired. Please request a new one.');
          setValidating(false);
          return;
        }

        setToken(inviteToken);
        setInviteEmail(membership.invited_email || '');
        setInviteRole(membership.role);
        setOrgName((membership.organizations as any)?.name || '');
        setTokenValid(true);
      } catch (err: any) {
        console.error('Token validation error:', err);
        setError('Failed to validate invite. Please try again.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [searchParams, supabase]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
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
      // Sign up with the invite token in metadata so the trigger can find the membership
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            invite_token: token,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while accepting the invite');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-clio-blue" />
      </div>
    );
  }

  if (!tokenValid && error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950 p-4">
        <Card className="w-full max-w-md bg-white dark:bg-clio-gray-900 border-clio-gray-200 dark:border-clio-gray-800">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-center uppercase tracking-tight">Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full border-clio-gray-200 dark:border-clio-gray-800" variant="outline">
                Back to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950 p-4">
        <Card className="w-full max-w-md bg-white dark:bg-clio-gray-900 border-clio-gray-200 dark:border-clio-gray-800">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                <UserPlus className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-center uppercase tracking-tight">Welcome to {orgName || 'the Team'}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-clio-gray-600 dark:text-clio-gray-400 font-medium">
              Your account has been created successfully. Please check your email at{' '}
              <strong className="text-clio-gray-900 dark:text-white">{inviteEmail}</strong> to verify your account.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full bg-clio-blue hover:bg-clio-blue-hover text-white font-bold">
                Continue to Login
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
          <CardTitle className="text-2xl font-bold text-center uppercase tracking-tight">Join {orgName || 'Team'}</CardTitle>
          <CardDescription className="text-center text-clio-gray-500 dark:text-clio-gray-400">
            You've been invited to join as <span className="text-clio-blue font-bold uppercase">{inviteRole}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                disabled
                className="bg-clio-gray-50 dark:bg-clio-gray-800/50 border-clio-gray-200 dark:border-clio-gray-800 text-clio-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-clio-blue hover:bg-clio-blue-hover text-white font-bold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Accept Invite & Create Account'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-clio-gray-600 dark:text-clio-gray-400 w-full font-medium">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-clio-blue hover:underline font-bold">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-clio-gray-50 dark:bg-clio-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-clio-blue" />
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
