'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { useAuth } from '@/components/auth/AuthProvider';

type Tables = Database['public']['Tables'];

/**
 * Hook for fetching bookings with real-time updates
 */
export function useBookings() {
  const [bookings, setBookings] = useState<Tables['bookings']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings((prev) => [payload.new as Tables['bookings']['Row'], ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === payload.new.id ? (payload.new as Tables['bookings']['Row']) : booking
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBookings((prev) => prev.filter((booking) => booking.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  return { bookings, loading, error };
}

/**
 * Hook for fetching quotes with real-time updates
 */
export function useQuotes() {
  const [quotes, setQuotes] = useState<Tables['quotes']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    const fetchQuotes = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQuotes((prev) => [payload.new as Tables['quotes']['Row'], ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setQuotes((prev) =>
              prev.map((quote) =>
                quote.id === payload.new.id ? (payload.new as Tables['quotes']['Row']) : quote
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setQuotes((prev) => prev.filter((quote) => quote.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  return { quotes, loading, error };
}

/**
 * Hook for fetching tasks with real-time updates
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Tables['tasks']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Tables['tasks']['Row'], ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === payload.new.id ? (payload.new as Tables['tasks']['Row']) : task
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((task) => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  return { tasks, loading, error };
}

/**
 * Hook for fetching commissions with real-time updates
 */
export function useCommissions() {
  const [commissions, setCommissions] = useState<Tables['commissions']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCommissions([]);
      setLoading(false);
      return;
    }

    const fetchCommissions = async () => {
      try {
        const { data, error } = await supabase
          .from('commissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCommissions(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('commissions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCommissions((prev) => [payload.new as Tables['commissions']['Row'], ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCommissions((prev) =>
              prev.map((commission) =>
                commission.id === payload.new.id ? (payload.new as Tables['commissions']['Row']) : commission
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCommissions((prev) => prev.filter((commission) => commission.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  return { commissions, loading, error };
}