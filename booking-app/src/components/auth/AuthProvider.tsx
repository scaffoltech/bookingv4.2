'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface OrgContext {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  stripe_customer_id: string | null;
}

interface MembershipContext {
  id: string;
  org_id: string;
  role: 'owner' | 'admin' | 'agent';
  status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  org: OrgContext | null;
  membership: MembershipContext | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  org: null,
  membership: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<OrgContext | null>(null);
  const [membership, setMembership] = useState<MembershipContext | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  const fetchProfile = async (userId: string) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) {
        console.error('fetchProfile error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('fetchProfile failed:', error);
      return null;
    }
  };

  const fetchOrgAndMembership = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('org_memberships')
        .select(`
          id,
          org_id,
          role,
          status,
          organizations (
            id,
            name,
            slug,
            owner_id,
            stripe_customer_id
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('fetchOrgAndMembership error:', error);
        return { org: null, membership: null };
      }

      const orgData = data.organizations as any;
      return {
        org: orgData as OrgContext,
        membership: {
          id: data.id,
          org_id: data.org_id,
          role: data.role,
          status: data.status,
        } as MembershipContext,
      };
    } catch (error) {
      console.error('fetchOrgAndMembership failed:', error);
      return { org: null, membership: null };
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 50));

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
        }

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user ?? null);

          // Background fetch profile and org
          Promise.all([
            fetchProfile(initialSession.user.id),
            fetchOrgAndMembership(initialSession.user.id),
          ]).then(([profileData, orgData]) => {
            if (mounted) {
              setProfile(profileData);
              setOrg(orgData.org);
              setMembership(orgData.membership);
            }
          });
        }
      } catch (error) {
        console.error('AuthProvider: Unexpected error during auth init:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthProvider: Timeout reached, forcing loading=false');
        setLoading(false);
      }
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setOrg(null);
        setMembership(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        if (newSession?.user) {
          Promise.all([
            fetchProfile(newSession.user.id),
            fetchOrgAndMembership(newSession.user.id),
          ]).then(([profileData, orgData]) => {
            if (mounted) {
              setProfile(profileData);
              setOrg(orgData.org);
              setMembership(orgData.membership);
            }
          });
        }
      } else if (event === 'INITIAL_SESSION') {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user ?? null);

          Promise.all([
            fetchProfile(newSession.user.id),
            fetchOrgAndMembership(newSession.user.id),
          ]).then(([profileData, orgData]) => {
            if (mounted) {
              setProfile(profileData);
              setOrg(orgData.org);
              setMembership(orgData.membership);
            }
          });
        }
        setLoading(false);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthProvider: signOut error:', error);
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      setOrg(null);
      setMembership(null);

      try {
        const STORAGE_KEYS = [
          'quote-store-supabase',
          'contact-store-supabase',
          'rate-store-supabase',
          'settings-store',
          'sidebar-store',
        ];
        STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
      } catch (storageError) {
        console.error('AuthProvider: Error clearing storage:', storageError);
      }
    } catch (error) {
      console.error('AuthProvider: signOut exception:', error);
      setUser(null);
      setSession(null);
      setProfile(null);
      setOrg(null);
      setMembership(null);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const [profileData, orgData] = await Promise.all([
          fetchProfile(session.user.id),
          fetchOrgAndMembership(session.user.id),
        ]);
        setProfile(profileData);
        setOrg(orgData.org);
        setMembership(orgData.membership);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        org,
        membership,
        loading,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
